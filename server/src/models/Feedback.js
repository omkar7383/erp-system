
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["Help Request", "Feedback", "Feature Suggestion"],
      required: true,
      default: "Help Request",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: [
        "New",
        "Under Review",
        "Planned",
        "Implemented",
        "Declined",
        "Responded",
        "Closed",
      ],
      default: "New",
      index: true,
    },

    adminReply: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ clientId: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
