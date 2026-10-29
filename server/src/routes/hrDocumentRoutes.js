const express = require("express");
const mongoose = require("mongoose");

const HRDocument = require("../models/HRDocument");
const Employee = require("../models/Employee");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const ALLOWED_TYPES = [
  "NDA_IP",
  "OFFER_LETTER",
  "JOINING_LETTER",
  "INTERNSHIP_COMPLETION",
];

const ALLOWED_STATUSES = [
  "Draft",
  "Generated",
  "Approved",
  "Revoked",
];

function isValidDate(value) {
  return value !== undefined &&
    value !== null &&
    value !== "" &&
    !Number.isNaN(new Date(value).getTime());
}

function validateDocument(body, isUpdate = false) {
  if (!isUpdate || body.employeeId !== undefined) {
    if (!mongoose.isValidObjectId(body.employeeId)) {
      return "A valid employee ID is required.";
    }
  }

  if (!isUpdate || body.documentType !== undefined) {
    if (!ALLOWED_TYPES.includes(body.documentType)) {
      return "Invalid document type.";
    }
  }

  if (body.issueDate !== undefined && !isValidDate(body.issueDate)) {
    return "A valid issue date is required.";
  }

  if (
    body.status !== undefined &&
    !ALLOWED_STATUSES.includes(body.status)
  ) {
    return "Invalid document status.";
  }

  if (
    body.documentNumber !== undefined &&
    body.documentNumber !== null &&
    typeof body.documentNumber !== "string"
  ) {
    return "Document number must be text.";
  }

  if (
    body.fileUrl !== undefined &&
    typeof body.fileUrl !== "string"
  ) {
    return "File URL must be text.";
  }

  return null;
}

function cleanDocumentNumber(value) {
  if (value === undefined || value === null || !String(value).trim()) {
    return undefined;
  }

  return String(value).trim();
}

function handleDatabaseError(error, res, next) {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Document number already exists.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return next(error);
}

// GET: All HR documents
router.get("/", async (req, res, next) => {
  try {
    const documents = await HRDocument.find()
      .populate("employeeId")
      .sort({ createdAt: -1 })
      .lean();

    // Keep the response compatible with the current frontend.
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

// GET: Single HR document
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await HRDocument.findById(req.params.id)
      .populate("employeeId");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
});

// POST: Create document
router.post("/", async (req, res, next) => {
  try {
    const validationError = validateDocument(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const employee = await Employee.findById(req.body.employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const document = await HRDocument.create({
      employeeId: employee._id,
      documentType: req.body.documentType,
      documentNumber: cleanDocumentNumber(req.body.documentNumber),
      issueDate: req.body.issueDate || new Date(),
      status: req.body.status || "Draft",
      fileUrl: req.body.fileUrl || "",
      remarks: req.body.remarks || "",
      createdBy: req.user?.id || req.user?._id || null,
    });

    const populatedDocument = await HRDocument.findById(document._id)
      .populate("employeeId");

    res.status(201).json(populatedDocument);
  } catch (error) {
    handleDatabaseError(error, res, next);
  }
});

// PUT: Update full document
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const validationError = validateDocument(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const document = await HRDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (req.body.employeeId !== undefined) {
      const employee = await Employee.findById(req.body.employeeId);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      document.employeeId = employee._id;
    }

    if (req.body.documentType !== undefined) {
      document.documentType = req.body.documentType;
    }

    if (req.body.documentNumber !== undefined) {
      document.documentNumber = cleanDocumentNumber(
        req.body.documentNumber
      );
    }

    if (req.body.issueDate !== undefined) {
      document.issueDate = req.body.issueDate;
    }

    if (req.body.status !== undefined) {
      document.status = req.body.status;
    }

    if (req.body.fileUrl !== undefined) {
      document.fileUrl = req.body.fileUrl;
    }

    if (req.body.remarks !== undefined) {
      document.remarks = String(req.body.remarks);
    }

    await document.save();
    await document.populate("employeeId");

    res.json(document);
  } catch (error) {
    handleDatabaseError(error, res, next);
  }
});

// PATCH: Update status and/or remarks
router.patch("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const updates = {};
    const { status, remarks } = req.body;

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid document status.",
        });
      }

      updates.status = status;
    }

    if (remarks !== undefined) {
      updates.remarks = String(remarks);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid updates provided.",
      });
    }

    const document = await HRDocument.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).populate("employeeId");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    res.json(document);
  } catch (error) {
    handleDatabaseError(error, res, next);
  }
});

// DELETE: Remove document record
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await HRDocument.findByIdAndDelete(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    res.json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;