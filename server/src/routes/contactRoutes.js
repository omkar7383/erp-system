const express = require("express");
const mongoose = require("mongoose");
const Contact = require("../models/Contact");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

// Allowed values
const ALLOWED_TYPES = ["Client", "Lead"];

const ALLOWED_STATUSES = [
  "New",
  "Contacted",
  "Active",
  "Inactive",
];

// Validate optional type field
function validateType(type) {
  return (
    type === undefined ||
    ALLOWED_TYPES.includes(type)
  );
}

// Validate optional status field
function validateStatus(status) {
  return (
    status === undefined ||
    ALLOWED_STATUSES.includes(status)
  );
}

// GET all contacts
router.get("/", async (req, res, next) => {
  try {
    const contacts = await Contact.find()
      .populate("clientId", "name company")
      .sort({ createdAt: -1 });

    res.json({
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
});

// GET single contact
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid contact ID",
      });
    }

    const contact = await Contact.findById(req.params.id)
      .populate("clientId", "name company");

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found",
      });
    }

    res.json({
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

// CREATE contact
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      type,
      status,
      ...otherFields
    } = req.body;

    // Validate name
    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        message: "Contact name is required",
      });
    }

    // Validate type
    if (!validateType(type)) {
      return res.status(400).json({
        message: "Type must be Client or Lead",
      });
    }

    // Validate status
    if (!validateStatus(status)) {
      return res.status(400).json({
        message:
          "Status must be New, Contacted, Active, or Inactive",
      });
    }

    const contact = await Contact.create({
      ...otherFields,
      name: name.trim(),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
    });

    res.status(201).json({
      data: contact,
      message: "Contact created successfully",
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE contact
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid contact ID",
      });
    }

    const {
      name,
      type,
      status,
      ...otherFields
    } = req.body;

    // Validate name if supplied
    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        message: "Contact name cannot be empty",
      });
    }

    // Validate type if supplied
    if (!validateType(type)) {
      return res.status(400).json({
        message: "Type must be Client or Lead",
      });
    }

    // Validate status if supplied
    if (!validateStatus(status)) {
      return res.status(400).json({
        message:
          "Status must be New, Contacted, Active, or Inactive",
      });
    }

    const updateData = {
      ...otherFields,
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("clientId", "name company");

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found",
      });
    }

    res.json({
      data: contact,
      message: "Contact updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE contact
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid contact ID",
      });
    }

    const contact = await Contact.findByIdAndDelete(
      req.params.id
    );

    if (!contact) {
      return res.status(404).json({
        message: "Contact not found",
      });
    }

    res.json({
      message: "Contact deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;