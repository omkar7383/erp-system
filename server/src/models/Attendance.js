
const mongoose = require("mongoose");

// ======================================================
// GPS LOCATION SCHEMA
// ======================================================

const attendanceLocationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      required: true,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
      required: true,
    },

    accuracy: {
      type: Number,
      min: 0,
      required: true,
    },

    distanceFromOffice: {
      type: Number,
      min: 0,
      required: true,
    },

    verificationStatus: {
      type: String,
      enum: ["Verified", "Failed", "Pending"],
      default: "Pending",
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verificationMethod: {
      type: String,
      trim: true,
      default: "GPS",
    },
  },
  {
    _id: false,
  }
);

// ======================================================
// FACE VERIFICATION SCHEMA
// ======================================================

const faceVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Verified", "Failed", "Pending", "Not Verified"],
      default: "Not Verified",
    },

    provider: {
      type: String,
      trim: true,
      default: "",
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verificationMethod: {
      type: String,
      trim: true,
      default: "",
    },

    // Store only a normalized similarity score between 0 and 1.
    // Never store face distance in this field.
    similarityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    // Store a reference only, never the actual face image.
    verificationReference: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

// ======================================================
// ATTENDANCE SCHEMA
// ======================================================

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: undefined,
    },

    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },

    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    date: {
      type: String,
      required: [true, "Attendance date is required"],
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Attendance date must use YYYY-MM-DD format",
      ],
    },

    // No fabricated check-in time.
    // The check-in endpoint must supply the actual time.
    checkIn: {
      type: String,
      default: null,

      validate: {
        validator(value) {
          return (
            value === null ||
            value === undefined ||
            value === "" ||
            /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
          );
        },

        message: "Check-in time must use HH:mm format",
      },
    },

    // NULL means the employee has not checked out.
    // Only the successful check-out operation should set a time.
    checkOut: {
      type: String,
      default: null,

      validate: {
        validator(value) {
          return (
            value === null ||
            value === undefined ||
            value === "" ||
            /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
          );
        },

        message: "Check-out time must use HH:mm format",
      },
    },

    status: {
      type: String,
      enum: [
        "Present",
        "Absent",
        "Late",
        "Half Day",
        "On Leave",
      ],
      required: [true, "Attendance status is required"],
      default: "Present",
    },

    // GPS verification details.
    location: {
      type: attendanceLocationSchema,
      default: undefined,
    },

    // Face recognition verification details.
    faceVerification: {
      type: faceVerificationSchema,
      default: () => ({
        status: "Not Verified",
      }),
    },

    // Overall verification method.
    verificationMethod: {
      type: String,
      trim: true,
      enum: [
        "Manual",
        "GPS",
        "Face Recognition",
        "Face + GPS",
      ],
      default: "Manual",
    },

    // True only when all required verification checks have passed.
    verificationCompleted: {
      type: Boolean,
      default: false,
    },

    // Time at which all required verification checks completed.
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// VERIFICATION CONSISTENCY VALIDATION
// ======================================================

attendanceSchema.pre("validate", function (next) {
  if (this.verificationCompleted === true) {
    const gpsVerified =
      this.location?.verificationStatus === "Verified";

    const faceVerified =
      this.faceVerification?.status === "Verified";

    const correctMethod =
      this.verificationMethod === "Face + GPS";

    const hasVerificationTime =
      this.verifiedAt instanceof Date &&
      !Number.isNaN(this.verifiedAt.getTime());

    if (
      !gpsVerified ||
      !faceVerified ||
      !correctMethod ||
      !hasVerificationTime
    ) {
      this.invalidate(
        "verificationCompleted",
        "Completed verification requires verified GPS, verified face, Face + GPS method, and a valid verification timestamp."
      );
    }
  }

  next();
});

// ======================================================
// DUPLICATE ATTENDANCE PROTECTION
// ======================================================

// Preserve the existing name/date uniqueness rule.
attendanceSchema.index(
  {
    name: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

// Prevent duplicate attendance for a linked employee.
attendanceSchema.index(
  {
    employeeId: 1,
    date: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      employeeId: {
        $type: "objectId",
      },
    },
  }
);

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);
