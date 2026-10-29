const express = require("express");
const mongoose = require("mongoose");

const Proposal = require("../models/Proposal");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const VALID_STATUSES = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
];

// Use UTC date in YYYY-MM-DD format.
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// Expire proposals whose validity date has passed.
async function expireOutdatedProposals() {
  const today = getTodayDate();

  await Proposal.updateMany(
    {
      status: { $in: ["Draft", "Sent"] },
      validUntil: { $ne: "", $lt: today },
    },
    {
      $set: { status: "Expired" },
    }
  );
}

// Validate proposal data.
function validateProposal(body, isUpdate = false) {
  if (!isUpdate || body.title !== undefined) {
    if (
      typeof body.title !== "string" ||
      !body.title.trim()
    ) {
      return "Proposal title is required.";
    }
  }

  if (!isUpdate || body.client !== undefined) {
    if (
      typeof body.client !== "string" ||
      !body.client.trim()
    ) {
      return "Client name is required.";
    }
  }

  if (!isUpdate || body.amount !== undefined) {
    if (
      body.amount === "" ||
      body.amount === null ||
      body.amount === undefined ||
      !Number.isFinite(Number(body.amount)) ||
      Number(body.amount) < 0
    ) {
      return "Enter a valid non-negative proposal amount.";
    }
  }

  if (
    body.status !== undefined &&
    !VALID_STATUSES.includes(body.status)
  ) {
    return "Invalid proposal status.";
  }

  if (
    body.clientEmail !== undefined &&
    body.clientEmail !== ""
  ) {
    if (
      typeof body.clientEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        body.clientEmail.trim()
      )
    ) {
      return "Enter a valid client email address.";
    }
  }

  const createdDate = body.createdDate;
  const validUntil = body.validUntil;

  if (
    createdDate &&
    validUntil &&
    validUntil < createdDate
  ) {
    return "Valid Until cannot be earlier than Created Date.";
  }

  return null;
}

// Helper: normalize optional string fields.
function normalizeOptionalFields(data) {
  const normalized = { ...data };

  if (normalized.clientEmail !== undefined) {
    normalized.clientEmail =
      typeof normalized.clientEmail === "string"
        ? normalized.clientEmail.trim().toLowerCase()
        : "";
  }

  if (normalized.project !== undefined) {
    normalized.project =
      typeof normalized.project === "string"
        ? normalized.project.trim()
        : "";
  }

  if (normalized.projectId !== undefined) {
    normalized.projectId =
      typeof normalized.projectId === "string"
        ? normalized.projectId.trim()
        : "";
  }

  if (normalized.description !== undefined) {
    normalized.description =
      typeof normalized.description === "string"
        ? normalized.description.trim()
        : "";
  }

  return normalized;
}

// GET all proposals.
router.get("/", async (req, res, next) => {
  try {
    await expireOutdatedProposals();

    const proposals = await Proposal.find().sort({
      createdAt: -1,
    });

    return res.json({ data: proposals });
  } catch (error) {
    next(error);
  }
});

// GET one proposal.
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid proposal ID.",
      });
    }

    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        message: "Proposal not found.",
      });
    }

    return res.json({ data: proposal });
  } catch (error) {
    next(error);
  }
});

// CREATE proposal.
router.post("/", async (req, res, next) => {
  try {
    const validationError = validateProposal(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const proposalData = normalizeOptionalFields({
      ...req.body,
      title: req.body.title.trim(),
      client: req.body.client.trim(),
      amount: Number(req.body.amount),
    });

    if (
      ["Draft", "Sent"].includes(
        proposalData.status || "Draft"
      ) &&
      proposalData.validUntil &&
      proposalData.validUntil < getTodayDate()
    ) {
      proposalData.status = "Expired";
    }

    const proposal = await Proposal.create(proposalData);

    return res.status(201).json({
      message: "Proposal created successfully.",
      data: proposal,
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
});

// UPDATE proposal.
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid proposal ID.",
      });
    }

    const validationError = validateProposal(
      req.body,
      true
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const existing = await Proposal.findById(
      req.params.id
    );

    if (!existing) {
      return res.status(404).json({
        message: "Proposal not found.",
      });
    }

    const data = normalizeOptionalFields({
      ...req.body,

      title:
        req.body.title !== undefined
          ? req.body.title.trim()
          : existing.title,

      client:
        req.body.client !== undefined
          ? req.body.client.trim()
          : existing.client,

      amount:
        req.body.amount !== undefined
          ? Number(req.body.amount)
          : existing.amount,

      clientEmail:
        req.body.clientEmail !== undefined
          ? req.body.clientEmail
          : existing.clientEmail,

      project:
        req.body.project !== undefined
          ? req.body.project
          : existing.project,

      projectId:
        req.body.projectId !== undefined
          ? req.body.projectId
          : existing.projectId,

      description:
        req.body.description !== undefined
          ? req.body.description
          : existing.description,

      createdDate:
        req.body.createdDate ?? existing.createdDate,

      validUntil:
        req.body.validUntil ?? existing.validUntil,

      status:
        req.body.status ?? existing.status,
    });

    if (
      ["Draft", "Sent"].includes(data.status) &&
      data.validUntil &&
      data.validUntil < getTodayDate()
    ) {
      data.status = "Expired";
    }

    Object.assign(existing, data);

    await existing.save();

    return res.json({
      message: "Proposal updated successfully.",
      data: existing,
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
});

// PATCH proposal status or selected fields.
router.patch("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid proposal ID.",
      });
    }

    const validationError = validateProposal(
      req.body,
      true
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const existing = await Proposal.findById(
      req.params.id
    );

    if (!existing) {
      return res.status(404).json({
        message: "Proposal not found.",
      });
    }

    const data = normalizeOptionalFields({
      ...req.body,
    });

    const nextStatus = data.status ?? existing.status;

    const nextValidUntil =
      data.validUntil ?? existing.validUntil;

    if (
      ["Draft", "Sent"].includes(nextStatus) &&
      nextValidUntil &&
      nextValidUntil < getTodayDate()
    ) {
      data.status = "Expired";
    }

    Object.assign(existing, data);

    await existing.save();

    return res.json({
      message: "Proposal updated successfully.",
      data: existing,
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
});

// MARK proposal as sent after the user manually sends
// the email through Gmail and confirms in the ERP.
router.post("/:id/mark-sent", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid proposal ID.",
      });
    }

    const proposal = await Proposal.findById(
      req.params.id
    );

    if (!proposal) {
      return res.status(404).json({
        message: "Proposal not found.",
      });
    }

    if (!proposal.clientEmail) {
      return res.status(400).json({
        message:
          "Client email is missing. Add the client's email before marking this proposal as sent.",
      });
    }

    if (proposal.status === "Expired") {
      return res.status(400).json({
        message:
          "This proposal has expired and cannot be marked as sent.",
      });
    }

    proposal.status = "Sent";
    proposal.sentAt = new Date();
    proposal.sentVia = "gmail_manual";

    await proposal.save();

    return res.json({
      message:
        "Proposal marked as sent. Please note that Gmail delivery was not independently verified.",
      data: proposal,
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
});

// DELETE proposal.
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid proposal ID.",
      });
    }

    const proposal = await Proposal.findByIdAndDelete(
      req.params.id
    );

    if (!proposal) {
      return res.status(404).json({
        message: "Proposal not found.",
      });
    }

    return res.json({
      message: "Proposal deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;