const mongoose = require("mongoose");

const hrDocumentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
      index: true,
    },

    documentType: {
      type: String,
      enum: [
        "NDA_IP",
        "OFFER_LETTER",
        "JOINING_LETTER",
        "INTERNSHIP_COMPLETION",
      ],
      required: [true, "Document type is required"],
    },

    documentNumber: {
      type: String,
      trim: true,
      default: undefined,
      sparse: true,
      unique: true,
    },

    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["Draft", "Generated", "Approved", "Revoked"],
      default: "Draft",
    },

    fileUrl: {
      type: String,
      default: "",
      trim: true,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("HRDocument", hrDocumentSchema);