const express = require("express");
const mongoose = require("mongoose");

const Expense = require("../models/Expense");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const ALLOWED_CATEGORIES = [
  "Office",
  "Travel",
  "Utilities",
  "Software",
  "Equipment",
  "Marketing",
  "Salary",
  "Other",
];

const ALLOWED_STATUSES = ["Paid", "Pending"];

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function validateExpense(body, isUpdate = false) {
  if (!isUpdate || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return "Expense title is required.";
    }
  }

  if (body.category !== undefined) {
    if (!ALLOWED_CATEGORIES.includes(body.category)) {
      return "Invalid expense category.";
    }
  }

  if (!isUpdate || body.date !== undefined) {
    if (
      typeof body.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ) {
      return "A valid expense date is required (YYYY-MM-DD).";
    }

    const parsedDate = new Date(`${body.date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== body.date
    ) {
      return "Invalid expense date.";
    }
  }

  if (!isUpdate || body.amount !== undefined) {
    if (
      body.amount === "" ||
      body.amount === null ||
      body.amount === undefined ||
      !Number.isFinite(Number(body.amount)) ||
      Number(body.amount) <= 0
    ) {
      return "Amount must be a valid number greater than zero.";
    }
  }

  if (!isUpdate || body.paidBy !== undefined) {
    if (typeof body.paidBy !== "string" || !body.paidBy.trim()) {
      return "Paid by is required.";
    }
  }

  if (
    body.status !== undefined &&
    !ALLOWED_STATUSES.includes(body.status)
  ) {
    return "Invalid expense status.";
  }

  if (body.notes !== undefined && typeof body.notes !== "string") {
    return "Notes must be text.";
  }

  return null;
}

function formatExpense(expense) {
  const data = expense.toObject ? expense.toObject() : expense;

  return {
    ...data,
    id: String(data._id),
  };
}

// GET all expenses
router.get("/", async (req, res, next) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });

    res.json({
      data: expenses.map(formatExpense),
    });
  } catch (error) {
    next(error);
  }
});

// GET single expense
router.get("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid expense ID.",
      });
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found.",
      });
    }

    res.json({
      data: formatExpense(expense),
    });
  } catch (error) {
    next(error);
  }
});

// CREATE expense
router.post("/", async (req, res, next) => {
  try {
    const validationError = validateExpense(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const {
      title,
      category = "Office",
      date,
      amount,
      paidBy,
      status = "Pending",
      notes = "",
    } = req.body;

    const expense = await Expense.create({
      title: title.trim(),
      category,
      date,
      amount: Number(amount),
      paidBy: paidBy.trim(),
      status,
      notes: notes.trim(),
    });

    res.status(201).json({
      data: formatExpense(expense),
      message: "Expense created successfully.",
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
});

// UPDATE expense
async function updateExpense(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid expense ID.",
      });
    }

    const validationError = validateExpense(req.body, true);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const updates = {};

    const allowedFields = [
      "title",
      "category",
      "date",
      "amount",
      "paidBy",
      "status",
      "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (updates.paidBy !== undefined) {
      updates.paidBy = updates.paidBy.trim();
    }

    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
    }

    if (updates.notes !== undefined) {
      updates.notes = updates.notes.trim();
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found.",
      });
    }

    res.json({
      data: formatExpense(expense),
      message: "Expense updated successfully.",
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
}

router.put("/:id", updateExpense);
router.patch("/:id", updateExpense);

// DELETE expense
router.delete("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid expense ID.",
      });
    }

    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found.",
      });
    }

    res.json({
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;