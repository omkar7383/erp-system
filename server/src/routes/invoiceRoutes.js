const express = require("express");
const mongoose = require("mongoose");

const Invoice = require("../models/Invoice");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const ALLOWED_STATUSES = ["Unpaid", "Paid"];

function validId(id) {
  return mongoose.isValidObjectId(id);
}

// Validate dates in YYYY-MM-DD format.
function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateInvoice(body, isUpdate = false) {
  if (!isUpdate || body.client !== undefined) {
    if (typeof body.client !== "string" || !body.client.trim()) {
      return "Client name is required.";
    }
  }

  if (!isUpdate || body.issueDate !== undefined) {
    if (!isValidDate(body.issueDate)) {
      return "A valid issue date is required (YYYY-MM-DD).";
    }
  }

  if (!isUpdate || body.dueDate !== undefined) {
    if (!isValidDate(body.dueDate)) {
      return "A valid due date is required (YYYY-MM-DD).";
    }
  }

  const issueDate = body.issueDate;
  const dueDate = body.dueDate;

  if (issueDate && dueDate && dueDate < issueDate) {
    return "Due date cannot be earlier than issue date.";
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

  if (
    body.status !== undefined &&
    !ALLOWED_STATUSES.includes(body.status)
  ) {
    return "Invalid payment status.";
  }

  if (
    body.email !== undefined &&
    typeof body.email !== "string"
  ) {
    return "Client email must be text.";
  }

  return null;
}

function formatInvoice(invoice) {
  const item = invoice.toObject ? invoice.toObject() : invoice;

  return {
    ...item,
    id: String(item._id),
  };
}

// Generate the next invoice number.
async function nextInvoiceNumber() {
  const invoices = await Invoice.find({}, "number").lean();

  const highest = invoices.reduce((max, invoice) => {
    const number = Number(
      String(invoice.number || "").replace(/^INV-/, "")
    );

    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 1000);

  return `INV-${highest + 1}`;
}

// GET: All invoices
router.get("/", async (req, res, next) => {
  try {
    const invoices = await Invoice.find()
      .sort({ createdAt: -1 });

    res.json({
      data: invoices.map(formatInvoice),
    });
  } catch (error) {
    next(error);
  }
});

// GET: Single invoice
router.get("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    res.json({
      data: formatInvoice(invoice),
    });
  } catch (error) {
    next(error);
  }
});

// POST: Create invoice
router.post("/", async (req, res, next) => {
  try {
    const validationError = validateInvoice(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const {
      client,
      email = "",
      issueDate,
      dueDate,
      amount,
      status = "Unpaid",
    } = req.body;

    const number = await nextInvoiceNumber();

    const invoice = await Invoice.create({
      number,
      client: client.trim(),
      email: email.trim().toLowerCase(),
      issueDate,
      dueDate,
      amount: Number(amount),
      status,
    });

    res.status(201).json({
      data: formatInvoice(invoice),
      message: "Invoice created successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Invoice number already exists. Please retry.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
});

// Shared UPDATE logic for PUT and PATCH
async function updateInvoice(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    const validationError = validateInvoice(req.body, true);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const updates = {};

    const allowedFields = [
      "client",
      "email",
      "issueDate",
      "dueDate",
      "amount",
      "status",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.client !== undefined) {
      updates.client = updates.client.trim();
    }

    if (updates.email !== undefined) {
      updates.email = updates.email.trim().toLowerCase();
    }

    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
    }

    // Validate date order using both existing and incoming values.
    const existing = await Invoice.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    const finalIssueDate = updates.issueDate ?? existing.issueDate;
    const finalDueDate = updates.dueDate ?? existing.dueDate;

    if (finalDueDate < finalIssueDate) {
      return res.status(400).json({
        message: "Due date cannot be earlier than issue date.",
      });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      data: formatInvoice(invoice),
      message: "Invoice updated successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Invoice number already exists.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
}

router.put("/:id", updateInvoice);
router.patch("/:id", updateInvoice);

// DELETE: Invoice
router.delete("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    res.json({
      message: "Invoice deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;