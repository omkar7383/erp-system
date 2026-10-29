const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    reference: {
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

    invoice: {
      type: String,
      default: "",
      trim: true,
    },

    date: {
      type: String,
      required: [true, "Payment date is required"],
    },

    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },

    method: {
      type: String,
      enum: [
        "Bank Transfer",
        "UPI",
        "Cash",
        "Card",
        "Cheque",
        "Other",
      ],
      default: "Bank Transfer",
    },

    status: {
      type: String,
      enum: ["Paid", "Pending", "Failed"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);