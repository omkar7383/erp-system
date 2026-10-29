const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Expense title is required"],
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Office",
        "Travel",
        "Utilities",
        "Software",
        "Equipment",
        "Marketing",
        "Salary",
        "Other",
      ],
      default: "Office",
    },

    date: {
      type: String,
      required: [true, "Expense date is required"],
    },

    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },

    paidBy: {
      type: String,
      required: [true, "Paid by is required"],
      trim: true,
    },

    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Pending",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Expense", expenseSchema);