
const express = require("express");
const mongoose = require("mongoose");

const Asset = require("../models/Asset");
const Assignment = require("../models/Assignment");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

// GET all assets
router.get("/", async (req, res, next) => {
  try {
    const assets = await Asset.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: assets });
  } catch (error) {
    next(error);
  }
});

// CREATE asset
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      category,
      assetTag,
      purchaseDate,
      value,
      status,
      location,
    } = req.body;

    if (!name || !category || !assetTag) {
      return res.status(400).json({
        success: false,
        message: "Name, category and asset tag are required.",
      });
    }

    const asset = await Asset.create({
      name,
      category,
      assetTag,
      purchaseDate: purchaseDate || null,
      value: value === "" || value == null ? 0 : Number(value),
      status: status || "Available",
      location: location || "",
    });

    res.status(201).json({
      success: true,
      data: asset,
      message: "Asset created successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Asset tag already exists.",
      });
    }

    next(error);
  }
});

// UPDATE asset
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID.",
      });
    }

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    const activeAssignment = await Assignment.findOne({
      assetId: asset._id,
      status: "Assigned",
    });

    if (
      activeAssignment &&
      req.body.status &&
      req.body.status !== "Assigned"
    ) {
      return res.status(409).json({
        success: false,
        message: "Return the active assignment before changing status.",
      });
    }

    const allowedFields = [
      "name",
      "category",
      "assetTag",
      "status",
      "location",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        asset[field] = req.body[field];
      }
    }

    if (req.body.purchaseDate !== undefined) {
      asset.purchaseDate = req.body.purchaseDate || null;
    }

    if (req.body.value !== undefined) {
      asset.value =
        req.body.value === "" || req.body.value == null
          ? 0
          : Number(req.body.value);
    }

    await asset.save();

    res.json({
      success: true,
      data: asset,
      message: "Asset updated successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Asset tag already exists.",
      });
    }

    next(error);
  }
});

// UPDATE asset status
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID.",
      });
    }

    const allowedStatuses = [
      "Available",
      "Assigned",
      "Maintenance",
      "Retired",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset status.",
      });
    }

    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    const activeAssignment = await Assignment.findOne({
      assetId: asset._id,
      status: "Assigned",
    });

    if (status === "Available" && activeAssignment) {
      return res.status(409).json({
        success: false,
        message: "Asset has an active assignment.",
      });
    }

    asset.status = status;
    await asset.save();

    res.json({
      success: true,
      data: asset,
      message: "Asset status updated.",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE asset
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset ID.",
      });
    }

    const activeAssignment = await Assignment.findOne({
      assetId: id,
      status: "Assigned",
    });

    if (activeAssignment) {
      return res.status(409).json({
        success: false,
        message: "Return the asset before deleting it.",
      });
    }

    const asset = await Asset.findByIdAndDelete(id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    res.json({
      success: true,
      message: "Asset deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
