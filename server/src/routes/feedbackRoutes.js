
const express = require("express");
const mongoose = require("mongoose");

const Feedback = require("../models/Feedback");
const Client = require("../models/Client");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const roleOf = (req) =>
  String(req.user?.role || "").toLowerCase();

const userIdOf = (req) => req.user?.id;

const isAdmin = (req) =>
  ["admin", "hr"].includes(roleOf(req));

const isClient = (req) =>
  roleOf(req) === "client";

const validId = (id) =>
  mongoose.isValidObjectId(id);

const TYPES = [
  "Help Request",
  "Feedback",
  "Feature Suggestion",
];

const STATUSES = [
  "New",
  "Under Review",
  "Planned",
  "Implemented",
  "Declined",
  "Responded",
  "Closed",
];

// CLIENT: Submit help request, feedback, or feature suggestion.
router.post("/", async (req, res) => {
  try {
    if (!isClient(req)) {
      return res.status(403).json({
        success: false,
        message: "Only clients can submit help requests or feedback.",
      });
    }

    const {
      type = "Help Request",
      subject,
      message,
    } = req.body || {};

    const clientId = userIdOf(req);

    if (!validId(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    if (!TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request type.",
      });
    }

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.trim().length > 160
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject is required and must be 160 characters or fewer.",
      });
    }

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.trim().length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: "Message is required and must be 5000 characters or fewer.",
      });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const feedback = await Feedback.create({
      clientId: client._id,
      clientName: client.name,
      type,
      subject: subject.trim(),
      message: message.trim(),
      status: "New",
    });

    return res.status(201).json({
      success: true,
      message: "Submitted successfully.",
      feedback,
    });
  } catch (error) {
    console.error("Create help/feedback:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit help request or feedback.",
    });
  }
});

// ADMIN/HR: View all submissions.
// CLIENT: View only their own submissions.
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (isClient(req)) {
      filter.clientId = userIdOf(req);
    } else if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    if (req.query.type) {
      if (!TYPES.includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid request type filter.",
        });
      }

      filter.type = req.query.type;
    }

    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter.",
        });
      }

      filter.status = req.query.status;
    }

    const feedback = await Feedback.find(filter)
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Fetch help/feedback:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch help requests and feedback.",
    });
  }
});

// View a single submission.
router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback ID.",
      });
    }

    const item = await Feedback.findById(req.params.id)
      .populate("reviewedBy", "name email");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Help/feedback record not found.",
      });
    }

    if (
      isClient(req) &&
      String(item.clientId) !== String(userIdOf(req))
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this record.",
      });
    }

    if (!isClient(req) && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    return res.json({
      success: true,
      feedback: item,
    });
  } catch (error) {
    console.error("Fetch help/feedback item:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch this record.",
    });
  }
});

// ADMIN/HR: Update review status and reply to client.
router.patch("/:id/review", async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only admin/HR can review submissions.",
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback ID.",
      });
    }

    const {
      status,
      adminReply = "",
    } = req.body || {};

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review status.",
      });
    }

    if (
      typeof adminReply !== "string" ||
      adminReply.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: "Admin reply must be text up to 5000 characters.",
      });
    }

    if (
      ["Responded", "Declined", "Implemented"].includes(status) &&
      !adminReply.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Add an admin reply for Responded, Declined, or Implemented status.",
      });
    }

    const item = await Feedback.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Help/feedback record not found.",
      });
    }

    item.status = status;
    item.adminReply = adminReply.trim();
    item.reviewedBy = validId(userIdOf(req))
      ? userIdOf(req)
      : null;
    item.reviewedAt = new Date();

    await item.save();

    return res.json({
      success: true,
      message: "Help/feedback review saved.",
      feedback: item,
    });
  } catch (error) {
    console.error("Review help/feedback:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update help/feedback review.",
    });
  }
});

module.exports = router;
