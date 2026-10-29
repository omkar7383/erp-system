const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // Multiple employees can be assigned to one task.
    assigneeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],

    // Legacy field retained for compatibility with older tasks.
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: undefined,
    },

    // Display fields retained for compatibility.
    project: {
      type: String,
      default: "",
      trim: true,
    },

    assignee: {
      type: String,
      default: "",
      trim: true,
    },

    dueDate: {
      type: String,
      default: "",
    },

    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["To Do", "Pending", "In Progress", "Completed", "On Hold"],
      default: "To Do",
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding tasks assigned to employees.
taskSchema.index({ assigneeIds: 1 });

module.exports = mongoose.model("Task", taskSchema);