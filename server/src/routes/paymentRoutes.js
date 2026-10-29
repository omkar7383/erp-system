const express = require("express");
const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const ALLOWED_METHODS = [
  "Bank Transfer",
  "UPI",
  "Cash",
  "Card",
  "Cheque",
  "Other",
];

const ALLOWED_STATUSES = ["Paid", "Pending", "Failed"];

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function formatPayment(payment) {
  const data = payment.toObject ? payment.toObject() : payment;

  return {
    ...data,
    id: String(data._id),
  };
}

function isValidDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validatePayment(body, isUpdate = false) {
  if (!isUpdate || body.client !== undefined) {
    if (typeof body.client !== "string" || !body.client.trim()) {
      return "Client name is required.";
    }
  }

  if (!isUpdate || body.date !== undefined) {
    if (!isValidDate(body.date)) {
      return "A valid payment date is required (YYYY-MM-DD).";
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
      return "Amount must be greater than zero.";
    }
  }

  if (
    body.method !== undefined &&
    !ALLOWED_METHODS.includes(body.method)
  ) {
    return "Invalid payment method.";
  }

  if (
    body.status !== undefined &&
    !ALLOWED_STATUSES.includes(body.status)
  ) {
    return "Invalid payment status.";
  }

  if (
    body.invoice !== undefined &&
    typeof body.invoice !== "string"
  ) {
    return "Invoice number must be text.";
  }

  return null;
}

// Validate selected invoice and keep its client consistent.
async function validateInvoiceSelection(invoiceNumber, clientName) {
  if (!invoiceNumber || !invoiceNumber.trim()) {
    return { invoice: null };
  }

  const invoice = await Invoice.findOne({
    number: invoiceNumber.trim(),
  });

  if (!invoice) {
    return { error: "Selected invoice was not found." };
  }

  if (
    clientName &&
    invoice.client.trim().toLowerCase() !== clientName.trim().toLowerCase()
  ) {
    return {
      error: "The selected invoice does not belong to this client.",
    };
  }

  return { invoice };
}

// Generate next payment reference.
async function nextPaymentReference() {
  const payments = await Payment.find({}, "reference").lean();

  const highest = payments.reduce((max, payment) => {
    const match = String(payment.reference || "").match(/^PAY-(\d+)$/);
    const number = match ? Number(match[1]) : 1000;

    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 1000);

  return `PAY-${highest + 1}`;
}

// GET: All payments
router.get("/", async (req, res, next) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });

    res.json({
      data: payments.map(formatPayment),
    });
  } catch (error) {
    next(error);
  }
});

// GET: Single payment
router.get("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    res.json({
      data: formatPayment(payment),
    });
  } catch (error) {
    next(error);
  }
});

// POST: Create payment
router.post("/", async (req, res, next) => {
  try {
    const validationError = validatePayment(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const {
      client,
      invoice = "",
      date,
      amount,
      method = "Bank Transfer",
      status = "Pending",
    } = req.body;

    if (invoice.trim()) {
      const result = await validateInvoiceSelection(invoice, client);

      if (result.error) {
        return res.status(400).json({
          message: result.error,
        });
      }
    }

    const payment = await Payment.create({
      reference: await nextPaymentReference(),
      client: client.trim(),
      invoice: invoice.trim(),
      date,
      amount: Number(amount),
      method,
      status,
    });

    res.status(201).json({
      data: formatPayment(payment),
      message: "Payment recorded successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Payment reference already exists. Please retry.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
});

// PUT/PATCH: Update payment
async function updatePayment(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    const validationError = validatePayment(req.body, true);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const existing = await Payment.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    const allowedFields = [
      "client",
      "invoice",
      "date",
      "amount",
      "method",
      "status",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.client !== undefined) {
      updates.client = updates.client.trim();
    }

    if (updates.invoice !== undefined) {
      updates.invoice = updates.invoice.trim();
    }

    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
    }

    const finalClient = updates.client ?? existing.client;
    const finalInvoice = updates.invoice ?? existing.invoice;

    if (finalInvoice) {
      const result = await validateInvoiceSelection(
        finalInvoice,
        finalClient
      );

      if (result.error) {
        return res.status(400).json({
          message: result.error,
        });
      }
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      data: formatPayment(payment),
      message: "Payment updated successfully.",
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
}

router.put("/:id", updatePayment);
router.patch("/:id", updatePayment);

// DELETE: Payment
router.delete("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findByIdAndDelete(req.params.id);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    res.json({
      message: "Payment deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;