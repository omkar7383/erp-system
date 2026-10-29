const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Client = require("../models/Client");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const SALT_ROUNDS = 10;

const VALID_STATUSES = [
  "Active",
  "Inactive",
  "Lead",
  "Prospect",
];

function cleanClientResponse(client) {
  const result = client.toObject
    ? client.toObject()
    : { ...client };

  delete result.passwordHash;
  delete result.__v;

  return result;
}

// GET all clients
router.get("/", async (req, res, next) => {
  try {
    const clients = await Client.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.json({
      data: clients.map(cleanClientResponse),
    });
  } catch (error) {
    next(error);
  }
});

// GET single client
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid client ID",
      });
    }

    const client = await Client.findById(req.params.id)
      .select("-passwordHash");

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    res.json({
      data: cleanClientResponse(client),
    });
  } catch (error) {
    next(error);
  }
});

// CREATE client
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      company = "",
      email,
      phone = "",
      status = "Lead",
      password,
      industry = "",
      address = "",
      website = "",
      notes = "",
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Client name is required",
      });
    }

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Client email is required",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid client status",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingClient = await Client.findOne({
      email: normalizedEmail,
    }).select("_id");

    if (existingClient) {
      return res.status(409).json({
        message: "A client with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      SALT_ROUNDS
    );

    const client = await Client.create({
      name: name.trim(),
      company,
      email: normalizedEmail,
      phone,
      status,
      passwordHash,
      industry,
      address,
      website,
      notes,
    });

    res.status(201).json({
      message: "Client created successfully",
      data: cleanClientResponse(client),
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE client
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid client ID",
      });
    }

    const {
      name,
      company,
      email,
      phone,
      status,
      password,
      industry,
      address,
      website,
      notes,
    } = req.body;

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        message: "Client name cannot be empty",
      });
    }

    if (
      email !== undefined &&
      (typeof email !== "string" || !email.trim())
    ) {
      return res.status(400).json({
        message: "Client email cannot be empty",
      });
    }

    if (
      status !== undefined &&
      !VALID_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid client status",
      });
    }

    if (
      password !== undefined &&
      (typeof password !== "string" || password.length < 8)
    ) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long",
      });
    }

    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (company !== undefined) updates.company = company;
    if (email !== undefined) {
      updates.email = email.trim().toLowerCase();
    }
    if (phone !== undefined) updates.phone = phone;
    if (status !== undefined) updates.status = status;
    if (industry !== undefined) updates.industry = industry;
    if (address !== undefined) updates.address = address;
    if (website !== undefined) updates.website = website;
    if (notes !== undefined) updates.notes = notes;

    // Password changes only when a new password is provided.
    if (password) {
      updates.passwordHash = await bcrypt.hash(
        password,
        SALT_ROUNDS
      );
    }

    if (updates.email) {
      const duplicate = await Client.findOne({
        email: updates.email,
        _id: { $ne: req.params.id },
      }).select("_id");

      if (duplicate) {
        return res.status(409).json({
          message: "A client with this email already exists",
        });
      }
    }

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("-passwordHash");

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    res.json({
      message: "Client updated successfully",
      data: cleanClientResponse(client),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE client
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid client ID",
      });
    }

    const client = await Client.findByIdAndDelete(
      req.params.id
    );

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    res.json({
      message: "Client deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;