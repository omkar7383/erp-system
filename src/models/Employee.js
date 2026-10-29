const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, trim: true, default: "" },
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  department: { type: String, trim: true, default: "" },
  designation: { type: String, trim: true, default: "" },
  joiningDate: { type: String, default: "" },
  status: { type: String, trim: true, default: "Active" },
  salary: { type: Number, min: 0, default: 0 }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model("Employee", employeeSchema);