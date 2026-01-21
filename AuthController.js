import getPrismaInstance from "./PrismaClient.js";
import { generateToken04 } from "./TokenGenerator.js";
import { generateReplies } from "./generateReplies.js";



export const checkUser = async (request, response, next) => {
  try {
    const { email } = request.body;
    if (!email) {
      return response.json({ msg: "Email is required", status: false });
    }
    const prisma = getPrismaInstance();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return response.json({ msg: "User not found", status: false });
    } else
      return response.json({ msg: "User Found", status: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteMessagesByUser = async (req, res, next) => {
  try {
    const prisma = getPrismaInstance();
    const messageId = parseInt(req.params.id, 10); // message ID

    if (isNaN(messageId)) {
      return res.status(400).json({ msg: "Invalid message ID", status: false });
    }

    const deletedMessage = await prisma.messages.delete({
      where: { id: messageId },
    });

    return res.status(200).json({
      msg: `Message ${messageId} deleted successfully`,
      status: true,
      deletedMessage,
    });
  } catch (error) {
    // Handle case where message ID does not exist
    if (error.code === "P2025") {
      return res.status(404).json({ msg: "Message not found", status: false });
    }
    next(error);
  }
};


export const deleteUser = async (req, res, next) => {
  try {
    3;
    const id = parseInt(req.params.id);

    const prisma = getPrismaInstance();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ msg: "User not found", status: false });
    }

    await prisma.user.delete({ where: { id } });

    return res
      .status(200)
      .json({ msg: "User deleted successfully", status: true });
  } catch (error) {
    next(error);
  }
};

export const addUser = async (req, res, next) => {
  try {
    const prisma = getPrismaInstance();

    // Destructure the required data from the request body
    const { email, name, profilePicture, about } = req.body;

    if (email && name) {
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          profilePicture: profilePicture || "/default_avatar.png", // Optional, default to a placeholder if not provided
          about: about || "", // Optional, default to an empty string if not provided
        },
      });
      return res.status(201).json({ user: newUser });
    }
    return res.status(400).send("Email and name are required.");
  } catch (err) {
    next(err);
  }
};
export const addTenUsersWithCustomIds = async (req, res, next) => {
  try {
    const prisma = getPrismaInstance();
    const { startingId = 1, contacts = [] } = req.body;

    if (!contacts.length) {
      return res.status(400).json({ error: "No contacts provided." });
    }

    const arrayOfUserObjects = contacts.map((contact, index) => {
      const id = startingId + index;

      return {
        id,
        email: contact.email || `user${id}@example.com`,
        name: contact.name,
        phoneNumber: contact.phoneNumber || null,
        profilePicture: contact.profilePicture || `/avatars/default.png`,
        about: contact.about || "",
      };
    });

    const result = await prisma.user.createMany({
      data: arrayOfUserObjects,
      skipDuplicates: true,
    });

    return res.status(201).json({
      message: `${result.count} contacts created successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBatchUsers = async (req, res, next) => {
  try {
    const startId = parseInt(req.params.startId);
    const prisma = getPrismaInstance();

    const idsToDelete = Array.from({ length: 3500 }, (_, i) => startId + i);

    // First, delete all messages related to these users
    await prisma.messages.deleteMany({
      where: {
        OR: [
          { senderId: { in: idsToDelete } },
          { recieverId: { in: idsToDelete } },
        ],
      },
    });

    // Now delete the users
    const result = await prisma.user.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
    });

    return res.status(200).json({
      message: `Contacts deleted.`,
      deletedCount: result.count,
    });
  } catch (err) {
    next(err);
  }
};

export const addUserWithCustomId = async (req, res, next) => {
  try {
    const prisma = getPrismaInstance();
    const { id, email, name, profilePicture, about } = req.body;

    if (!id || id < 100) {
      return res.status(400).json({ msg: "ID must be provided and >= 100" });
    }

    if (!email || !name) {
      return res.status(400).json({ msg: "Email and name are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (existingUser) {
      return res.status(409).json({ msg: "User ID already exists" });
    }

    const newUser = await prisma.user.create({
      data: {
        id,
        email,
        name,
        profilePicture: profilePicture || "/default_avatar.png",
        about: about || "",
      },
    });

    return res.status(201).json({ user: newUser });
  } catch (err) {
    next(err);
  }
};

// AuthController.js


// Cancel endpoint


export const broadcastMessageToAll = async (req, res, next) => {
  try {
    const {
      message,
      senderId,
      botCount: rawBotCount,
      botDelays: rawBotDelays,
    } = req.body;

    if (!message || !senderId) {
      return res.status(400).json({ message: "Both message and senderId are required." });
    }

    const prisma = getPrismaInstance();

    const users = await prisma.user.findMany({ select: { id: true } });
    if (!users.length) return res.status(200).json({ message: "No users to broadcast to." });

    const senderRecipients = users.filter(u => u.id !== 1 && u.id !== 2);
    if (!senderRecipients.length) return res.status(200).json({ message: "No eligible users to broadcast to." });

    const BATCH_SIZE = 300;

    // Step 1: Sender → users
    for (let i = 0; i < senderRecipients.length; i += BATCH_SIZE) {
      const batch = senderRecipients.slice(i, i + BATCH_SIZE);
      const messageData = batch.map(user => ({
        senderId,
        recieverId: user.id,
        message,
      }));
      try {
        await prisma.messages.createMany({ data: messageData, skipDuplicates: false });
        console.log(`📤 Sender sent batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      } catch (err) {
        console.error("❌ Error sending batch:", err);
      }
    }

    // Step 2: Bot config
    const botCount = Math.min(Math.max(parseInt(rawBotCount || 8), 1), 100);
    const botDelays = Array.isArray(rawBotDelays)
      ? rawBotDelays.map(d => parseInt(d, 10) || 0).slice(0, botCount)
      : Array(botCount).fill(0);

    const botSenderIds = Array.from({ length: botCount }, (_, i) => i + 3);

    // Load replies into generator
    const botRepliesRaw = await prisma.botReply.findMany({ orderBy: { id: "asc" } });
    generateReplies.setReplies(botRepliesRaw);

    // Get exactly botCount replies (cycled if fewer in DB)
    const repliesForBots = generateReplies.getNextNReplies(botSenderIds.length);

    console.log("Bots:", botSenderIds);
    console.log("Replies:", repliesForBots);
    console.log("Delays:", botDelays);

    // Step 3: Send bot messages sequentially
    for (let i = 0; i < botSenderIds.length; i++) {
      const botId = botSenderIds[i];
      const reply = repliesForBots[i];
      const delay = botDelays[i] || 0;

      if (!reply) {
        console.warn(`⚠️ No reply for bot ${botId}`);
        continue;
      }

      // Wait before this bot sends
      await new Promise(resolve => setTimeout(resolve, delay));

      for (let j = 0; j < users.length; j += BATCH_SIZE) {
        const batch = users.slice(j, j + BATCH_SIZE);
        const botMessages = batch.map(u => ({
          senderId: botId,
          recieverId: u.id,
          message: reply,
        }));
        try {
          await prisma.messages.createMany({ data: botMessages, skipDuplicates: false });
          console.log(`🤖 Bot ${botId} sent batch ${Math.floor(j / BATCH_SIZE) + 1} after ${delay}ms`);
        } catch (err) {
          console.error(`❌ Bot ${botId} failed in batch ${Math.floor(j / BATCH_SIZE) + 1}:`, err);
        }
      }
    }

    return res.status(200).json({ message: "Broadcasted successfully.", status: true });
  } catch (err) {
    console.error("❌ Broadcast error:", err);
    next(err);
  }
};









export const onBoardUser = async (request, response, next) => {
  try {
    const {
      email,
      name,
      about = "Available",
      image: profilePicture,
    } = request.body;
    if (!email || !name || !profilePicture) {
      return response.json({
        msg: "Email, Name and Image are required",
      });
    } else {
      const prisma = getPrismaInstance();
      await prisma.user.create({
        data: { email, name, about, profilePicture },
      });
      return response.json({ msg: "Success", status: true });
    }
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const prisma = getPrismaInstance();
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        about: true,
      },
    });
    const usersGroupedByInitialLetter = {};
    users.forEach((user) => {
      const initialLetter = user.name.charAt(0).toUpperCase();
      if (!usersGroupedByInitialLetter[initialLetter]) {
        usersGroupedByInitialLetter[initialLetter] = [];
      }
      usersGroupedByInitialLetter[initialLetter].push(user);
    });

    return res.status(200).send({ users: usersGroupedByInitialLetter });
  } catch (error) {
    next(error);
  }
};

export const generateToken = (req, res, next) => {
  try {
    const appID = parseInt(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_APP_SECRET;
    const userId = req.params.userId;
    const effectiveTimeInSeconds = 3600;
    const payload = "";
    if (appID && serverSecret && userId) {
      const token = generateToken04(
        appID,
        userId,
        serverSecret,
        effectiveTimeInSeconds,
        payload
      );
      res.status(200).json({ token });
    }
    return res
      .status(400)
      .send("User id, app id and server secret is required");
  } catch (err) {
    console.log({ err });
    next(err);
  }
};