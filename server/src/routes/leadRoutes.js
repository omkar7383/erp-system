
const express = require("express");
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

// GET all leads
router.get("/", async (req, res, next) => {
  try {
    const leads = await Lead.find()
      .populate("clientId", "name company")
      .sort({ createdAt: -1 });

    res.json({ data: leads });
  } catch (error) {
    next(error);
  }
});

// GET single lead
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
});

// CREATE lead
router.post("/", async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: "Lead name is required" });
    }

    const lead = await Lead.create(req.body);
    res.status(201).json({ data: lead });
  } catch (error) {
    next(error);
  }
});

// UPDATE lead, including status = Converted
router.patch("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
});

// Also support PUT updates
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
});

// DELETE lead
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
