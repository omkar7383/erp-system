const express = require("express");
const mongoose = require("mongoose");

const Assignment = require("../models/Assignment");
const Asset = require("../models/Asset");
const Employee = require("../models/Employee");

const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

// GET all assignments
router.get("/", async (req, res, next) => {
  try {
    const assignments = await Assignment.find()
      .populate("assetId", "name assetTag category status")
      .populate(
        "employeeId",
        "firstName lastName name employeeId email"
      )
      .sort({ createdAt: -1 });

    const data = assignments.map((assignment) => {
      const item = assignment.toObject();

      if (
        item.status !== "Returned" &&
        item.expectedReturnDate &&
        new Date(item.expectedReturnDate) < new Date()
      ) {
        item.status = "Overdue";
      }

      return item;
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// CREATE assignment
router.post("/", async (req, res, next) => {
  try {
    const {
      assetId,
      employeeId,
      assignedDate,
      expectedReturnDate,
      notes,
    } = req.body;

    if (!assetId || !employeeId) {
      return res.status(400).json({
        success: false,
        message: "Asset and employee are required.",
      });
    }

    if (
      !mongoose.isValidObjectId(assetId) ||
      !mongoose.isValidObjectId(employeeId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid asset or employee ID.",
      });
    }

    const [asset, employee] = await Promise.all([
      Asset.findById(assetId),
      Employee.findById(employeeId),
    ]);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found.",
      });
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (asset.status !== "Available") {
      return res.status(409).json({
        success: false,
        message: "Only available assets can be assigned.",
      });
    }

    const assignment = await Assignment.create({
      assetId,
      employeeId,
      assignedDate: assignedDate || new Date(),
      expectedReturnDate: expectedReturnDate || null,
      status: "Assigned",
      notes: notes || "",
    });

    asset.status = "Assigned";
    await asset.save();

    const populatedAssignment = await Assignment.findById(
      assignment._id
    )
      .populate("assetId", "name assetTag category status")
      .populate(
        "employeeId",
        "firstName lastName name employeeId email"
      );

    res.status(201).json({
      success: true,
      data: populatedAssignment,
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE assignment
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    const oldAssetId = assignment.assetId.toString();

    if (req.body.assetId !== undefined) {
      if (!mongoose.isValidObjectId(req.body.assetId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid asset ID.",
        });
      }

      const newAsset = await Asset.findById(req.body.assetId);

      if (!newAsset) {
        return res.status(404).json({
          success: false,
          message: "Asset not found.",
        });
      }

      if (
        req.body.assetId !== oldAssetId &&
        newAsset.status !== "Available"
      ) {
        return res.status(409).json({
          success: false,
          message: "Selected asset is not available.",
        });
      }

      assignment.assetId = req.body.assetId;
    }

    if (req.body.employeeId !== undefined) {
      if (!mongoose.isValidObjectId(req.body.employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID.",
        });
      }

      const employee = await Employee.findById(req.body.employeeId);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      assignment.employeeId = req.body.employeeId;
    }

    if (req.body.assignedDate !== undefined) {
      assignment.assignedDate = req.body.assignedDate;
    }

    if (req.body.expectedReturnDate !== undefined) {
      assignment.expectedReturnDate =
        req.body.expectedReturnDate || null;
    }

    if (req.body.notes !== undefined) {
      assignment.notes = req.body.notes;
    }

    if (req.body.status !== undefined) {
      if (!["Assigned", "Returned", "Overdue"].includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment status.",
        });
      }

      assignment.status = req.body.status;
    }

    await assignment.save();

    const newAssetId = assignment.assetId.toString();

    // Release the old asset if assignment was moved to another asset.
    if (oldAssetId !== newAssetId) {
      const oldAssetStillAssigned = await Assignment.exists({
        assetId: oldAssetId,
        status: "Assigned",
        _id: { $ne: assignment._id },
      });

      if (!oldAssetStillAssigned) {
        await Asset.findByIdAndUpdate(oldAssetId, {
          status: "Available",
        });
      }
    }

    // Keep the selected asset's status in sync.
    if (assignment.status === "Returned") {
      const otherActiveAssignment = await Assignment.exists({
        assetId: newAssetId,
        status: "Assigned",
        _id: { $ne: assignment._id },
      });

      if (!otherActiveAssignment) {
        await Asset.findByIdAndUpdate(newAssetId, {
          status: "Available",
        });
      }
    } else {
      await Asset.findByIdAndUpdate(newAssetId, {
        status: "Assigned",
      });
    }

    const updated = await Assignment.findById(assignment._id)
      .populate("assetId", "name assetTag category status")
      .populate(
        "employeeId",
        "firstName lastName name employeeId email"
      );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// MARK assignment as returned
router.patch("/:id/return", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    assignment.status = "Returned";
    await assignment.save();

    const otherActiveAssignment = await Assignment.exists({
      assetId: assignment.assetId,
      status: "Assigned",
      _id: { $ne: assignment._id },
    });

    if (!otherActiveAssignment) {
      await Asset.findByIdAndUpdate(assignment.assetId, {
        status: "Available",
      });
    }

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE assignment
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    await Assignment.findByIdAndDelete(req.params.id);

    if (assignment.status === "Assigned") {
      const anotherActiveAssignment = await Assignment.exists({
        assetId: assignment.assetId,
        status: "Assigned",
      });

      if (!anotherActiveAssignment) {
        await Asset.findByIdAndUpdate(assignment.assetId, {
          status: "Available",
        });
      }
    }

    res.json({
      success: true,
      message: "Assignment deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;