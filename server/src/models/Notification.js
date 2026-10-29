const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // User who will receive this notification
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Recipient role: Admin, HR, Employee or Client
    recipientRole: {
      type: String,
      enum: ["admin", "hr", "employee", "client"],
      required: true,
      lowercase: true,
      trim: true,
    },

    // Notification heading
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // Notification details
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Module that generated the notification
    type: {
      type: String,
      enum: [
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
      ],
      default: "general",
      index: true,
    },

    // Page to open when the notification is clicked
    link: {
      type: String,
      default: null,
      trim: true,
    },

    // Whether the recipient has read the notification
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Efficiently retrieve notifications for a specific user
notificationSchema.index({
  recipientId: 1,
  recipientRole: 1,
  createdAt: -1,
});

// Efficiently retrieve unread notifications for a user
notificationSchema.index({
  recipientId: 1,
  recipientRole: 1,
  isRead: 1,
});

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);