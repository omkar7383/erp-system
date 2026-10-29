const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    client: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    issueDate: {
      type: String,
      required: [true, "Issue date is required"],
    },

    dueDate: {
      type: String,
      required: [true, "Due date is required"],
    },

    amount: {
      type: Number,
      required: [true, "Invoice amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },

    status: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);