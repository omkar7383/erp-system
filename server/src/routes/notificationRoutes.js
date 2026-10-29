const express = require("express");
const mongoose = require("mongoose");

const Notification = require("../models/Notification");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// All notification routes require authentication.
router.use(requireAuth);

// Supported roles for notification access.
const ALLOWED_ROLES = ["admin", "employee", "client"];

// Validate authenticated user's role.
function isAllowedRole(req) {
  return ALLOWED_ROLES.includes(
    String(req.user?.role || "").toLowerCase()
  );
}

// Return a consistent unauthorized/unsupported-role response.
function checkNotificationAccess(req, res) {
  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return false;
  }

  if (!isAllowedRole(req)) {
    res.status(403).json({
      success: false,
      message: "Your role cannot access notifications.",
    });
    return false;
  }

  return true;
}

// GET /api/notifications
// Get notifications belonging only to the current user.
router.get("/", async (req, res) => {
  if (!checkNotificationAccess(req, res)) return;

  try {
    const notifications = await Notification.find({
      recipientId: req.user.id,
      recipientRole: String(req.user.role).toLowerCase(),
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
});

// GET /api/notifications/unread-count
// Get unread notification count for the current user.
router.get("/unread-count", async (req, res) => {
  if (!checkNotificationAccess(req, res)) return;

  try {
    const count = await Notification.countDocuments({
      recipientId: req.user.id,
      recipientRole: String(req.user.role).toLowerCase(),
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Unread notification count error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch unread notification count.",
    });
  }
});

// PATCH /api/notifications/:id/read
// Mark one notification as read.
// Ownership is checked so users cannot update another user's notification.
router.patch("/:id/read", async (req, res) => {
  if (!checkNotificationAccess(req, res)) return;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipientId: req.user.id,
        recipientRole: String(req.user.role).toLowerCase(),
      },
      {
        $set: {
          isRead: true,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
});

// PATCH /api/notifications/read-all
// Mark all notifications belonging to the current user as read.
router.patch("/read-all", async (req, res) => {
  if (!checkNotificationAccess(req, res)) return;

  try {
    const result = await Notification.updateMany(
      {
        recipientId: req.user.id,
        recipientRole: String(req.user.role).toLowerCase(),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications.",
    });
  }
});

module.exports = router;