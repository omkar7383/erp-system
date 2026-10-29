const express = require("express");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

function cleanPayload(body) {
  const allowed = [
    "employeeId", "name", "email", "phone", "department",
    "designation", "joiningDate", "status", "salary"
  ];
  const output = {};
  for (const key of allowed) {
    if (body[key] !== undefined) output[key] = body[key];
  }
  if (output.email) output.email = String(output.email).trim().toLowerCase();
  if (output.name !== undefined) output.name = String(output.name).trim();
  if (output.salary !== undefined) output.salary = Number(output.salary);
  return output;
}

// GET /api/employees
router.get("/", async (req, res, next) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: employees });
  } catch (error) {
    next(error);
  }
});

// GET /api/employees/:id
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid employee id" });
    }
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
});

// POST /api/employees
router.post("/", async (req, res, next) => {
  try {
    const payload = cleanPayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ success: false, message: "Employee name is required" });
    }
    const employee = await Employee.create(payload);
    res.status(201).json({ success: true, data: employee, message: "Employee created" });
  } catch (error) {
    next(error);
  }
});

// PUT /api/employees/:id
router.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid employee id" });
    }
    const payload = cleanPayload(req.body);
    const employee = await Employee.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    res.json({ success: true, data: employee, message: "Employee updated" });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/employees/:id
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid employee id" });
    }
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    res.json({ success: true, message: "Employee deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;