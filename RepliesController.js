// controllers/RepliesController.js
import { PrismaClient } from "@prisma/client";
import { generateReplies } from "./generateReplies.js";

const prisma = new PrismaClient();

export const setRepliesHandler = async (req, res) => {
  try {
    const { replies } = req.body;

    if (!Array.isArray(replies) || replies.length === 0) {
      return res.status(400).json({ message: "Replies must be a non-empty array." });
    }

    // Clear existing replies
    await prisma.botReply.deleteMany();

    // Insert new replies
    const created = await prisma.botReply.createMany({
      data: replies.map((text) => ({ content: text })),
    });

    // Update the in-memory reply cache
    const updatedReplies = await prisma.botReply.findMany({ select: { content: true } });
    generateReplies.setReplies(updatedReplies);

    return res.status(200).json({
      message: "Replies updated successfully.",
      totalInserted: created.count,
    });
  } catch (err) {
    console.error("Error setting replies:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// RepliesController.js

export const getRepliesHandler = async (req, res) => {

  try {
    const replies = await prisma.botReply.findMany({
      orderBy: { id: "asc" },
    });
    res.status(200).json({ replies });
  } catch (err) {
    console.error("Failed to fetch replies:", err);
    res.status(500).json({ error: "Failed to load replies" });
  }
};

export const deleteReplyHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.botReply.delete({ where: { id: parseInt(id) } });
    return res.status(200).json({ message: "Reply deleted." });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ message: "Delete failed." });
  }
};

export const updateReplyHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const updated = await prisma.botReply.update({
      where: { id: parseInt(id) },
      data: { content },
    });

    return res.status(200).json({ message: "Reply updated.", reply: updated });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Update failed." });
  }
};


export const addReplyHandler = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ message: "Invalid content" });
    }

    const newReply = await prisma.botReply.create({ data: { content } });
    return res.status(201).json({ message: "Reply added.", reply: newReply });
  } catch (err) {
    console.error("Error adding reply:", err);
    console.log("Available Prisma models:", Object.keys(prisma));

    
    return res.status(500).json({ message: "Failed to add reply." });
  }
};


