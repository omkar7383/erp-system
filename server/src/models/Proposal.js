const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Proposal title is required"],
      trim: true,
    },

    client: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },

    // Client's email fetched from the CRM.
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Please enter a valid client email address.",
      },
    },

    // Optional related project.
    project: {
      type: String,
      trim: true,
      default: "",
    },

    projectId: {
      type: String,
      trim: true,
      default: "",
    },

    // Proposal description and scope of work.
    description: {
      type: String,
      trim: true,
      default: "",
    },

    amount: {
      type: Number,
      required: [true, "Proposal amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    createdDate: {
      type: String,
      default: "",
    },

    validUntil: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Rejected", "Expired"],
      default: "Draft",
    },

    // Set when the user manually confirms sending through Gmail.
    sentAt: {
      type: Date,
      default: null,
    },

    sentVia: {
      type: String,
      enum: ["", "gmail_manual"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Proposal", proposalSchema);