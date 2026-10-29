const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Laptop",
        "Desktop",
        "Monitor",
        "Mobile",
        "Printer",
        "Furniture",
        "Other",
      ],
    },
    assetTag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Available", "Assigned", "Maintenance", "Retired"],
      default: "Available",
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Asset || mongoose.model("Asset", assetSchema);