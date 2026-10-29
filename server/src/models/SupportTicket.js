
const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },

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

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Technical Issue",
        "Project Issue",
        "Billing",
        "Account",
        "Other",
      ],
      default: "Other",
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: [
        "Open",
        "Assigned",
        "In Progress",
        "Resolved",
        "Closed",
      ],
      default: "Open",
    },

    // Employee assigned to resolve the ticket
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    // Admin who assigned the ticket
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Admin handling the ticket personally
    handledByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Final solution visible to the client
    resolutionNote: {
      type: String,
      default: "",
      trim: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Efficient client ticket history
supportTicketSchema.index({
  clientId: 1,
  createdAt: -1,
});

// Efficient employee ticket filtering
supportTicketSchema.index({
  assignedTo: 1,
  status: 1,
});

// Efficient admin ticket filtering
supportTicketSchema.index({
  handledByAdmin: 1,
  status: 1,
});

module.exports = mongoose.model(
  "SupportTicket",
  supportTicketSchema
);
