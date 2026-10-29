
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

const ALLOWED_ROLES = ["admin", "hr", "employee", "client"];

const ALLOWED_TYPES = [
  "task",
  "leave",
  "attendance",
  "project",
  "invoice",
  "payment",
  "proposal",
  "support-ticket",
  "help-feedback",
  "general",
];

async function createNotification(
  io,
  {
    recipientId,
    recipientRole,
    title,
    message,
    type = "general",
    link = null,
  } = {}
) {
  // Validate Socket.IO instance
  if (!io || typeof io.to !== "function") {
    throw new Error("Valid Socket.IO instance is required.");
  }

  // Normalize recipient role
  const normalizedRole = String(recipientRole || "")
    .trim()
    .toLowerCase();

  // Validate recipient ID
  if (!mongoose.isValidObjectId(recipientId)) {
    throw new Error("Invalid notification recipient ID.");
  }

  // Validate recipient role
  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    throw new Error("Invalid notification recipient role.");
  }

  // Validate title and message
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    throw new Error(
      "Notification title and message are required."
    );
  }

  // Validate notification type
  if (!ALLOWED_TYPES.includes(type)) {
    throw new Error("Invalid notification type.");
  }

  // Validate optional link
  if (
    link !== null &&
    (typeof link !== "string" || !link.trim())
  ) {
    throw new Error(
      "Notification link must be a non-empty string or null."
    );
  }

  // Save notification in MongoDB first
  const notification = await Notification.create({
    recipientId,
    recipientRole: normalizedRole,
    title: title.trim(),
    message: message.trim(),
    type,
    link: link?.trim() || null,
  });

  // Send real-time notification to the recipient's private room
  const room = `user:${normalizedRole}:${String(recipientId)}`;

  io.to(room).emit(
    "new_notification",
    notification.toObject()
  );

  return notification;
}

module.exports = {
  createNotification,
};
