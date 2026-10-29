const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },

    // Existing client name field preserved for compatibility.
    client: {
      type: String,
      default: "",
      trim: true,
    },

    // Links the project to a specific Client record.
    // Optional so existing projects remain valid.
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true,
    },

    manager: {
      type: String,
      default: "",
      trim: true,
    },

    deadline: {
      type: String,
      default: "",
      trim: true,
    },

    budget: {
      type: Number,
      default: 0,
      min: [0, "Budget cannot be negative"],
      validate: {
        validator: Number.isFinite,
        message: "Budget must be a valid number",
      },
    },

    status: {
      type: String,
      enum: ["Planning", "In Progress", "On Hold", "Completed"],
      default: "Planning",
    },

    progress: {
      type: Number,
      default: 0,
      min: [0, "Progress cannot be less than 0"],
      max: [100, "Progress cannot exceed 100"],
      validate: {
        validator: Number.isFinite,
        message: "Progress must be a valid number",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Completed projects must always have 100% progress.
projectSchema.pre("validate", function (next) {
  if (this.status === "Completed") {
    this.progress = 100;
  }

  next();
});

module.exports = mongoose.model("Project", projectSchema);