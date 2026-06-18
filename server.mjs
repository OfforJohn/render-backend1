// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import mysql from "mysql2";
import axios from "axios";
import { Server } from "socket.io";

import AuthRoutes from "./AuthRoutes.js";
import MessageRoutes from "./MessageRoutes.js";
import getPrismaInstance from "./PrismaClient.js";

const prisma = getPrismaInstance();

dotenv.config();
const app = express();

// ───── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// serve uploaded recordings and images
app.use("/uploads/recordings", express.static("uploads/recordings"));
app.use("/uploads/images",    express.static("uploads/images"));

// ───── API Routes ─────────────────────────────────────────────────────────────
app.use("/api/auth",     AuthRoutes);
app.use("/api/messages", MessageRoutes);



// ───── MySQL Connection ───────────────────────────────────────────────────────
const db = mysql.createConnection({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
   password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
 
  
});db.connect(err => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL");
});

// make db available in your routes via req.app.locals
app.locals.db = db;

// ───── Background Queue Processor for WhatsApp Profiles ─────────────────────────
async function processWhatsAppQueue(jobId, phoneNumbers) {
  console.log(`[Queue] Starting job ${jobId} with ${phoneNumbers.length} numbers`);
  
  // Update job status to processing
  await prisma.profileJob.update({
    where: { id: jobId },
    data: { status: "processing" }
  });

  let processedCount = 0;
  const BATCH_SIZE = 10; // Process 10 at a time to avoid rate limits
  const DELAY_MS = 1000; // 1 second delay between batches

  for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
    const batch = phoneNumbers.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (phoneNumber) => {
      try {
        const profileRes = await axios.get(
          `https://whatsapp-data10.p.rapidapi.com/picture?phoneNumber=${encodeURIComponent(phoneNumber)}&return=url&cache=true`,
          {
            headers: {
              "x-rapidapi-key": process.env.RAPIDAPI_KEY,
              "x-rapidapi-host": "whatsapp-data10.p.rapidapi.com",
              "Content-Type": "application/json",
            },
          }
        );

        const profile = profileRes.data || {};
        const pictureUrl = profile.picture || profile.url || profile.pictureUrl || null;

        await prisma.whatsAppProfile.upsert({
          where: { phoneNumber },
          update: {
            pictureUrl,
            isValid: true,
            status: "valid",
            jobId,
          },
          create: {
            phoneNumber,
            pictureUrl,
            isValid: true,
            status: "valid",
            jobId,
          },
        });
      } catch (err) {
        const status = err.response?.status === 400 ? "invalid" : "error";
        await prisma.whatsAppProfile.upsert({
          where: { phoneNumber },
          update: {
            pictureUrl: null,
            isValid: false,
            status,
            jobId,
          },
          create: {
            phoneNumber,
            pictureUrl: null,
            isValid: false,
            status,
            jobId,
          },
        });
      }
    }));

    processedCount += batch.length;
    
    // Update progress
    await prisma.profileJob.update({
      where: { id: jobId },
      data: { processedCount }
    });

    console.log(`[Queue] Job ${jobId}: ${processedCount}/${phoneNumbers.length} processed`);

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < phoneNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Mark job as completed
  await prisma.profileJob.update({
    where: { id: jobId },
    data: { status: "completed" }
  });

  console.log(`[Queue] Job ${jobId} completed!`);
}

// ───── Batch WhatsApp Profile Endpoints ──────────────────────────────────────

// POST /api/whatsapp-profiles/batch - Start a batch job (up to 1000 numbers)
app.post("/api/whatsapp-profiles/batch", async (req, res) => {
  const { phone_numbers } = req.body;

  if (!phone_numbers || !Array.isArray(phone_numbers)) {
    return res.status(400).json({ error: "Please provide an array of phone_numbers" });
  }

  if (phone_numbers.length > 1000) {
    return res.status(400).json({ error: "Maximum 1000 phone numbers per batch" });
  }

  try {
    // Create a new job
    const job = await prisma.profileJob.create({
      data: {
        totalCount: phone_numbers.length,
        processedCount: 0,
        status: "pending",
      },
    });

    // Start background processing (non-blocking)
    processWhatsAppQueue(job.id, phone_numbers).catch(err => {
      console.error(`[Queue] Job ${job.id} failed:`, err);
      prisma.profileJob.update({
        where: { id: job.id },
        data: { status: "failed" }
      }).catch(console.error);
    });

    res.status(202).json({
      message: "Batch job started",
      jobId: job.id,
      totalCount: phone_numbers.length,
      status: "pending",
    });
  } catch (err) {
    console.error("Error creating batch job:", err);
    res.status(500).json({ error: "Failed to create batch job" });
  }
});

// GET /api/whatsapp-profiles/jobs/:jobId - Get job status
app.get("/api/whatsapp-profiles/jobs/:jobId", async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await prisma.profileJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      jobId: job.id,
      totalCount: job.totalCount,
      processedCount: job.processedCount,
      progress: Math.round((job.processedCount / job.totalCount) * 100),
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err) {
    console.error("Error fetching job:", err);
    res.status(500).json({ error: "Failed to fetch job status" });
  }
});

// GET /api/whatsapp-profiles/jobs/:jobId/results - Get profiles for a specific job
app.get("/api/whatsapp-profiles/jobs/:jobId/results", async (req, res) => {
  const { jobId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  try {
    const [profiles, total] = await Promise.all([
      prisma.whatsAppProfile.findMany({
        where: { jobId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.whatsAppProfile.count({ where: { jobId } }),
    ]);

    res.json({
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching profiles:", err);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

// GET /api/whatsapp-profiles - Get all profiles from DB
app.get("/api/whatsapp-profiles", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const status = req.query.status; // optional filter: valid, invalid, error
  const skip = (page - 1) * limit;

  try {
    const where = status ? { status } : {};
    
    const [profiles, total] = await Promise.all([
      prisma.whatsAppProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.whatsAppProfile.count({ where }),
    ]);

    res.json({
      profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching profiles:", err);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

// DELETE /api/whatsapp-profiles/jobs/:jobId - Delete all profiles from a job and the job itself
app.delete("/api/whatsapp-profiles/jobs/:jobId", async (req, res) => {
  const { jobId } = req.params;

  try {
    // Delete all profiles associated with the job
    const deletedProfiles = await prisma.whatsAppProfile.deleteMany({
      where: { jobId },
    });

    // Delete the job itself
    await prisma.profileJob.delete({
      where: { id: jobId },
    }).catch(() => {}); // Ignore if job doesn't exist

    res.json({
      message: "Job and associated profiles deleted",
      deletedProfilesCount: deletedProfiles.count,
    });
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// DELETE /api/whatsapp-profiles - Delete all profiles (use with caution)
app.delete("/api/whatsapp-profiles", async (req, res) => {
  const { status } = req.query; // optional: only delete profiles with specific status

  try {
    const where = status ? { status } : {};
    const deleted = await prisma.whatsAppProfile.deleteMany({ where });

    res.json({
      message: status ? `Deleted all ${status} profiles` : "Deleted all profiles",
      deletedCount: deleted.count,
    });
  } catch (err) {
    console.error("Error deleting profiles:", err);
    res.status(500).json({ error: "Failed to delete profiles" });
  }
});

// GET /api/whatsapp-profiles/:phoneNumber - Get a specific profile
app.get("/api/whatsapp-profiles/:phoneNumber", async (req, res) => {
  const { phoneNumber } = req.params;

  try {
    const profile = await prisma.whatsAppProfile.findUnique({
      where: { phoneNumber },
    });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// DELETE /api/whatsapp-profiles/:phoneNumber - Delete a specific profile
app.delete("/api/whatsapp-profiles/:phoneNumber", async (req, res) => {
  const { phoneNumber } = req.params;

  try {
    const profile = await prisma.whatsAppProfile.delete({
      where: { phoneNumber },
    });

    res.json({ message: "Profile deleted", profile });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Profile not found" });
    }
    console.error("Error deleting profile:", err);
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

// ───── New Route to Handle WhatsApp Number Validation ─────────────────────────────
// ───── New Route: WhatsApp Validation + Profile Data ──────────────────────────
// ✅ 1. WhatsApp Profile Validation Route (using whatsapp-data10 API)
app.post("/api/validate-whatsapp-profiles", async (req, res) => {
  const { phone_numbers } = req.body;

  if (!phone_numbers || !Array.isArray(phone_numbers)) {
    return res
      .status(400)
      .json({ error: "Please provide an array of phone numbers." });
  }

  const results = [];

  for (const num of phone_numbers) {
    try {
      const profileRes = await axios.get(
        `https://whatsapp-data10.p.rapidapi.com/picture?phoneNumber=${encodeURIComponent(num)}&return=url&cache=true`,
        {
          headers: {
            "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            "x-rapidapi-host": "whatsapp-data10.p.rapidapi.com",
            "Content-Type": "application/json",
          },
        }
      );

      const profile = profileRes.data || {};
      let status = "valid";

      results.push({
        phone_number: num,
        is_valid: true,
        avatar: profile.picture || profile.url || profile.pictureUrl || null,
        profileRaw: profile,
        status,
      });
    } catch (err) {
      const errorData = err.response?.data || {};
      const errorCode = err.response?.status;
      let status = "unknown";

      if (errorCode === 400) {
        status = "invalid";
      }

      results.push({
        phone_number: num,
        is_valid: false,
        avatar: null,
        profileRaw: errorData,
        error: errorData,
        status,
      });
    }
  }

  res.status(200).json(results);
});

// ✅ 2. Image Proxy Route (Fixes CORS issues)
app.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Image URL is required" });
  }

  try {
    // Fetch image as binary
    const response = await axios.get(url, { responseType: "arraybuffer" });

    // Set headers so the browser accepts it
    res.setHeader("Content-Type", response.headers["content-type"]);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(Buffer.from(response.data, "binary"));
  } catch (err) {
    console.error("Proxy failed:", err.message);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});







// ───── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});



// ───── Start HTTP & Socket.IO Servers ────────────────────────────────────────
const PORT = process.env.PORT || 3005;
const server = app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this in production
    methods: ["GET", "POST"]
  }
});


// Make io available in your routes:
app.locals.io = io;


// track online users

global.onlineUsers = new Map();
io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit("online-users", {
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  });
  
  
  



  socket.on("signout", (id) => {
    onlineUsers.delete(id);
    socket.broadcast.emit("online-users", {
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  });
  

  socket.on("outgoing-voice-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("incoming-voice-call", {
        from: data.from,
        roomId: data.roomId,
        callType: data.callType,
      });
    } else {
      const senderSocket = onlineUsers.get(data.from);
      socket.to(senderSocket).emit("voice-call-offline");
    }
  });

  socket.on("reject-voice-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.from);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("voice-call-rejected");
    }
  });

  socket.on("outgoing-video-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("incoming-video-call", {
        from: data.from,
        roomId: data.roomId,
        callType: data.callType,
      });
    } else {
      const senderSocket = onlineUsers.get(data.from);
      socket.to(senderSocket).emit("video-call-offline");
    }
  });

  socket.on("accept-incoming-call", ({ id }) => {
    const sendUserSocket = onlineUsers.get(id);
    socket.to(sendUserSocket).emit("accept-call");
  });

  socket.on("reject-video-call", (data) => {
    const sendUserSocket = onlineUsers.get(data.from);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("video-call-rejected");
    }
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket
        .to(sendUserSocket)
        .emit("msg-recieve", { from: data.from, message: data.message });
    }
  });
  console.log(socket.listenerCount("add-user")); // will show number of add-user listeners


  socket.on("mark-read", ({ id, recieverId }) => {
    const sendUserSocket = onlineUsers.get(id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("mark-read-recieve", { id, recieverId });
    }
  });
});