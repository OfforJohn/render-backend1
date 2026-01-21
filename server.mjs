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

// ───── New Route to Handle WhatsApp Number Validation ─────────────────────────────
// ───── New Route: WhatsApp Validation + Profile Data ──────────────────────────
// ✅ 1. WhatsApp Profile Validation Route
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
        `https://whatsapp-profile-data.p.rapidapi.com/mobile?mobile=${encodeURIComponent(num)}`,
        {
          headers: {
            "x-rapidapi-key": process.env.RAPIDAPI_PROFILE_KEY,
            "x-rapidapi-host": "whatsapp-profile-data.p.rapidapi.com",
          },
        }
      );

      const profile = profileRes.data || {};
      let status = "valid";

      // mark invalid if API says so
      if (
        profile.code === 400 &&
        typeof profile.message === "string" &&
        profile.message.toLowerCase() === "invalid phone number"
      ) {
        status = "invalid";
      }

      results.push({
        phone_number: num,
        is_valid: true,
        avatar:
          profile.avatar ||
          profile.profile_pic ||
          profile.profile?.profile_pic ||
          profile.profilePic ||
          profile.profilePicUrl ||
          profile.data?.head_image ||
          null,
        profileRaw: profile,
        status,
      });
    } catch (err) {
      const errorData = err.response?.data || {};
      const errorCode = err.response?.status;
      let status = "unknown";

      if (
        errorCode === 400 &&
        errorData.code === 400 &&
        typeof errorData.message === "string" &&
        errorData.message.toLowerCase() === "invalid phone number"
      ) {
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