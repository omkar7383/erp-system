const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const tf = require("@tensorflow/tfjs");
const wasm = require("@tensorflow/tfjs-backend-wasm");
const faceapi = require("@vladmandic/face-api/dist/face-api.node-wasm.js");
const canvas = require("canvas");
const { Canvas, Image, ImageData, loadImage } = canvas;

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

const DEFAULT_ATTENDANCE_SETTINGS = {
  officeStartTime: "09:00",
  gracePeriodMinutes: 15,
  officeEndTime: "18:00",
  minimumWorkingHours: 8,
  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  minimumHoursForHalfDay: 4,
  halfDayEndTime: "13:00",
  timezone: "Asia/Kolkata",
};

const OFFICE_LATITUDE = Number(process.env.OFFICE_LATITUDE);
const OFFICE_LONGITUDE = Number(process.env.OFFICE_LONGITUDE);

const OFFICE_RADIUS_METERS = Number(
  process.env.OFFICE_RADIUS_METERS || 100
);

const MAX_GPS_ACCURACY_METERS = Number(
  process.env.MAX_GPS_ACCURACY_METERS || 150
);

const FACE_MATCH_THRESHOLD = Number(
  process.env.FACE_MATCH_THRESHOLD || 0.52
);

const FACE_MODELS_PATH = process.env.FACE_MODELS_PATH
  ? path.resolve(process.env.FACE_MODELS_PATH)
  : path.join(__dirname, "..", "face-models");

const attendanceSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: "global",
    },
    officeStartTime: {
      type: String,
      default: "09:00",
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
    },
    officeEndTime: {
      type: String,
      default: "18:00",
    },
    minimumWorkingHours: {
      type: Number,
      default: 8,
    },
    workingDays: {
      type: [String],
      default: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    },
    minimumHoursForHalfDay: {
      type: Number,
      default: 4,
    },
    halfDayEndTime: {
      type: String,
      default: "13:00",
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
  },
  {
    timestamps: true,
    collection: "attendance_settings",
  }
);

const AttendanceSettings =
  mongoose.models.AttendanceSettings ||
  mongoose.model("AttendanceSettings", attendanceSettingsSchema);

async function readAttendanceSettings() {
  const saved = await AttendanceSettings.findOne({
    key: "global",
  }).lean();

  return {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...(saved || {}),
  };
}

function getTimeParts(timeZone = "Asia/Kolkata", date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
}

function getTodayDate(timeZone = "Asia/Kolkata") {
  const parts = getTimeParts(timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getCurrentTime(timeZone = "Asia/Kolkata") {
  const parts = getTimeParts(timeZone);
  return `${parts.hour}:${parts.minute}`;
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function isValidTime(time) {
  return (
    typeof time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  );
}

const ALLOWED_STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Half Day",
  "On Leave",
];

function requireAdminOrHR(req, res, next) {
  if (!["admin", "hr"].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to manage attendance records.",
    });
  }

  next();
}

function requireEmployee(req, res, next) {
  if (req.user?.role !== "employee") {
    return res.status(403).json({
      success: false,
      message: "This action is available to employees only.",
    });
  }

  next();
}

async function getOwnEmployee(req) {
  const userId = req.user?.id || req.user?._id;
  let employee = null;

  if (userId) {
    employee = await Employee.findOne({
      userId,
    }).select("+faceEnrollment.faceDescriptor");
  }

  if (!employee && req.user?.email) {
    employee = await Employee.findOne({
      email: String(req.user.email).trim().toLowerCase(),
      $or: [
        { userId: { $exists: false } },
        { userId: null },
      ],
    }).select("+faceEnrollment.faceDescriptor");

    if (employee && userId) {
      employee.userId = userId;
      await employee.save();
    }
  }

  return employee;
}

function isOfficeGeofenceConfigured() {
  return (
    process.env.OFFICE_LATITUDE !== undefined &&
    process.env.OFFICE_LONGITUDE !== undefined &&
    Number.isFinite(OFFICE_LATITUDE) &&
    Number.isFinite(OFFICE_LONGITUDE) &&
    OFFICE_LATITUDE >= -90 &&
    OFFICE_LATITUDE <= 90 &&
    OFFICE_LONGITUDE >= -180 &&
    OFFICE_LONGITUDE <= 180 &&
    Number.isFinite(OFFICE_RADIUS_METERS) &&
    OFFICE_RADIUS_METERS > 0 &&
    Number.isFinite(MAX_GPS_ACCURACY_METERS) &&
    MAX_GPS_ACCURACY_METERS > 0
  );
}

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function validateCheckInLocation(location) {
  if (
    !location ||
    location.latitude === undefined ||
    location.longitude === undefined ||
    location.accuracy === undefined ||
    !Number.isFinite(Number(location.latitude)) ||
    !Number.isFinite(Number(location.longitude)) ||
    !Number.isFinite(Number(location.accuracy))
  ) {
    return {
      valid: false,
      status: 400,
      message: "Valid GPS latitude, longitude, and accuracy are required.",
    };
  }

  if (!isOfficeGeofenceConfigured()) {
    return {
      valid: false,
      status: 503,
      message: "Office GPS settings are not configured correctly.",
    };
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy = Number(location.accuracy);

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    accuracy < 0
  ) {
    return {
      valid: false,
      status: 400,
      message: "GPS coordinates or accuracy are invalid.",
    };
  }

  if (accuracy > MAX_GPS_ACCURACY_METERS) {
    return {
      valid: false,
      status: 400,
      message: `GPS accuracy is too low (${Math.round(accuracy)}m).`,
      accuracyMeters: Math.round(accuracy),
    };
  }

  const distance = getDistanceInMeters(
    OFFICE_LATITUDE,
    OFFICE_LONGITUDE,
    latitude,
    longitude
  );

  if (distance > OFFICE_RADIUS_METERS) {
    return {
      valid: false,
      status: 403,
      message: `You are outside the office attendance area. Distance: ${Math.round(distance)}m.`,
      distanceMeters: Math.round(distance),
      accuracyMeters: Math.round(accuracy),
    };
  }

  return {
    valid: true,
    distanceMeters: Math.round(distance),
    accuracyMeters: Math.round(accuracy),
  };
}

function isValidFaceImageDataUrl(faceImage) {
  if (typeof faceImage !== "string") {
    return false;
  }

  if (
    !/^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/.test(
      faceImage
    )
  ) {
    return false;
  }

  return faceImage.length <= 7 * 1024 * 1024;
}

let tensorflowReady = false;
let tensorflowLoading = null;

async function ensureTensorflowReady() {
  if (tensorflowReady) {
    return;
  }

  if (!tensorflowLoading) {
    tensorflowLoading = (async () => {
      const wasmDistPath = path.join(
        path.dirname(require.resolve("@tensorflow/tfjs-backend-wasm")),
        ""
      );

      wasm.setWasmPaths(
        wasmDistPath.endsWith(path.sep)
          ? wasmDistPath
          : wasmDistPath + path.sep
      );

      await tf.setBackend("wasm");
      await tf.ready();

      tensorflowReady = true;
    })().catch((error) => {
      tensorflowLoading = null;
      throw error;
    });
  }

  await tensorflowLoading;
}

let faceModelsLoaded = false;
let faceModelsLoading = null;

async function ensureFaceModelsLoaded() {
  if (faceModelsLoaded) {
    return;
  }

  await ensureTensorflowReady();

  if (!faceModelsLoading) {
    faceModelsLoading = Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(FACE_MODELS_PATH),
      faceapi.nets.faceLandmark68Net.loadFromDisk(FACE_MODELS_PATH),
      faceapi.nets.faceRecognitionNet.loadFromDisk(FACE_MODELS_PATH),
    ])
      .then(() => {
        faceModelsLoaded = true;
      })
      .catch((error) => {
        faceModelsLoading = null;
        throw error;
      });
  }

  await faceModelsLoading;
}

async function getFaceDescriptor(faceImage) {
  if (!isValidFaceImageDataUrl(faceImage)) {
    const error = new Error(
      "A valid JPEG or PNG face image is required."
    );
    error.status = 400;
    throw error;
  }

  await ensureFaceModelsLoaded();

  const base64 = faceImage.substring(faceImage.indexOf(",") + 1);
  const buffer = Buffer.from(base64, "base64");
  const image = await loadImage(buffer);

  const detection = await faceapi
    .detectSingleFace(
      image,
      new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.5,
      })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    const error = new Error(
      "No clear face was detected. Please capture your face again."
    );
    error.status = 400;
    throw error;
  }

  return Array.from(detection.descriptor);
}

function calculateFaceDistance(descriptorA, descriptorB) {
  if (
    !Array.isArray(descriptorA) ||
    !Array.isArray(descriptorB) ||
    descriptorA.length !== descriptorB.length ||
    descriptorA.length === 0
  ) {
    throw new Error("Stored face descriptor is invalid.");
  }

  let sum = 0;

  for (let index = 0; index < descriptorA.length; index++) {
    const difference =
      Number(descriptorA[index]) - Number(descriptorB[index]);

    sum += difference * difference;
  }

  return Math.sqrt(sum);
}
function validateAttendance(body, isUpdate = false) {
  const {
    name,
    department,
    date,
    checkIn,
    checkOut,
    status,
  } = body || {};

  if (!isUpdate || name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return "Employee name is required.";
    }
  }

  if (!isUpdate || department !== undefined) {
    if (typeof department !== "string" || !department.trim()) {
      return "Department is required.";
    }
  }

  if (!isUpdate || date !== undefined) {
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) ||
      new Date(`${date}T00:00:00.000Z`)
        .toISOString()
        .slice(0, 10) !== date
    ) {
      return "A valid date is required in YYYY-MM-DD format.";
    }
  }

  if (checkIn !== undefined && checkIn !== null && !isValidTime(checkIn)) {
    return "Check-in time must use HH:mm format.";
  }

  if (checkOut !== undefined && checkOut !== null && !isValidTime(checkOut)) {
    return "Check-out time must use HH:mm format.";
  }

  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return "Invalid attendance status.";
  }

  return null;
}

// ======================================================
// FACE ENROLLMENT
// POST /api/attendance/my/face-enrollment
// ======================================================

router.post(
  "/my/face-enrollment",
  requireEmployee,
  async (req, res) => {
    try {
      const employee = await getOwnEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found.",
        });
      }

      if (employee.status && employee.status !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Your employee account is not active.",
        });
      }

      const { faceImage, consent } = req.body || {};

      if (consent !== true) {
        return res.status(400).json({
          success: false,
          message:
            "Explicit biometric consent is required before enrollment.",
        });
      }

      let descriptor;

      try {
        descriptor = await getFaceDescriptor(faceImage);
      } catch (error) {
        return res.status(error.status || 400).json({
          success: false,
          message: error.message || "Unable to process face image.",
        });
      }

      const previousVersion =
        Number(employee.faceEnrollment?.enrollmentVersion) || 0;

      employee.faceEnrollment = {
        ...(employee.faceEnrollment?.toObject?.() ||
          employee.faceEnrollment ||
          {}),
        status: "Enrolled",
        faceDescriptor: descriptor,
        provider: "vladmandic-face-api",
        enrolledAt: new Date(),
        enrollmentVersion: previousVersion + 1,
      };

      employee.biometricConsent = {
        given: true,
        consentedAt: new Date(),
        consentVersion: "1.0",
      };

      await employee.save();

      return res.status(200).json({
        success: true,
        message: "Face enrollment completed successfully.",
        enrollment: {
          status: "Enrolled",
          enrolledAt: employee.faceEnrollment.enrolledAt,
          enrollmentVersion:
            employee.faceEnrollment.enrollmentVersion,
        },
      });
    } catch (error) {
      console.error("Face enrollment error:", error?.stack || error);

      return res.status(500).json({
        success: false,
        message: "Face enrollment failed.",
      });
    }
  }
);

// ======================================================
// ATTENDANCE SETTINGS
// GET /api/attendance/settings
// PUT /api/attendance/settings
// ======================================================

router.get(
  "/settings",
  requireAdminOrHR,
  async (req, res) => {
    try {
      const settings = await readAttendanceSettings();

      return res.json({
        success: true,
        settings,
      });
    } catch (error) {
      console.error("Read attendance settings error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load attendance settings.",
      });
    }
  }
);

router.put(
  "/settings",
  requireAdminOrHR,
  async (req, res) => {
    try {
      const body = req.body || {};

      const allowedFields = [
        "officeStartTime",
        "gracePeriodMinutes",
        "officeEndTime",
        "minimumWorkingHours",
        "workingDays",
        "minimumHoursForHalfDay",
        "halfDayEndTime",
        "timezone",
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      if (
        updates.officeStartTime !== undefined &&
        !isValidTime(updates.officeStartTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid office start time.",
        });
      }

      if (
        updates.officeEndTime !== undefined &&
        !isValidTime(updates.officeEndTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid office end time.",
        });
      }

      if (
        updates.halfDayEndTime !== undefined &&
        !isValidTime(updates.halfDayEndTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid half-day end time.",
        });
      }

      for (const field of [
        "gracePeriodMinutes",
        "minimumWorkingHours",
        "minimumHoursForHalfDay",
      ]) {
        if (updates[field] !== undefined) {
          const value = Number(updates[field]);

          if (!Number.isFinite(value) || value < 0) {
            return res.status(400).json({
              success: false,
              message: `Invalid value for ${field}.`,
            });
          }

          updates[field] = value;
        }
      }

      if (updates.workingDays !== undefined) {
        const validDays = [
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
          "Sun",
        ];

        if (
          !Array.isArray(updates.workingDays) ||
          !updates.workingDays.every((day) =>
            validDays.includes(day)
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid working days.",
          });
        }
      }

      const settings = await AttendanceSettings.findOneAndUpdate(
        { key: "global" },
        {
          $set: {
            ...DEFAULT_ATTENDANCE_SETTINGS,
            ...updates,
            key: "global",
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

      return res.json({
        success: true,
        message: "Attendance settings updated.",
        settings,
      });
    } catch (error) {
      console.error("Update attendance settings error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update attendance settings.",
      });
    }
  }
);

// ======================================================
// GET ATTENDANCE RECORDS
// GET /api/attendance
// ======================================================

router.get("/", async (req, res) => {
  try {
    const isAdminOrHR = ["admin", "hr"].includes(
      req.user?.role
    );

    const query = {};

    if (!isAdminOrHR) {
      const employee = await getOwnEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found.",
        });
      }

      query.employeeId = employee._id;
    } else {
      if (req.query.employeeId) {
        query.employeeId = req.query.employeeId;
      }

      if (req.query.status) {
        query.status = req.query.status;
      }
    }

    if (req.query.date) {
      query.date = req.query.date;
    }

    if (req.query.from || req.query.to) {
      query.date = {};

      if (req.query.from) {
        query.date.$gte = req.query.from;
      }

      if (req.query.to) {
        query.date.$lte = req.query.to;
      }
    }

    const records = await Attendance.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .lean();

    return res.json({
      success: true,
      count: records.length,
      attendance: records,
    });
  } catch (error) {
    console.error("Get attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve attendance records.",
    });
  }
});
// ======================================================
// GET MY TODAY'S ATTENDANCE
// GET /api/attendance/my/today
// ======================================================

router.get(
  "/my/today",
  requireEmployee,
  async (req, res) => {
    try {
      const employee = await getOwnEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found.",
        });
      }

      const settings = await readAttendanceSettings();
      const today = getTodayDate(settings.timezone);

      const attendance = await Attendance.findOne({
        employeeId: employee._id,
        date: today,
      }).lean();

      return res.json({
        success: true,
        date: today,
        attendance,
        faceEnrolled:
          employee.faceEnrollment?.status === "Enrolled",
      });
    } catch (error) {
      console.error("Get today's attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve today's attendance.",
      });
    }
  }
);

// ======================================================
// EMPLOYEE CHECK-IN
// POST /api/attendance/my/check-in
// ======================================================

router.post(
  "/my/check-in",
  requireEmployee,
  async (req, res) => {
    try {
      const employee = await getOwnEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found.",
        });
      }

      if (
        employee.status &&
        employee.status.toLowerCase() !== "active"
      ) {
        return res.status(403).json({
          success: false,
          message: "Your employee account is not active.",
        });
      }

      if (
        employee.faceEnrollment?.status !== "Enrolled" ||
        !employee.biometricConsent?.given
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Face enrollment and biometric consent are required before check-in.",
        });
      }

      const { location, faceImage } = req.body || {};

      // 1. Validate office geofence.
      const gpsResult = validateCheckInLocation(location);

      if (!gpsResult.valid) {
        return res.status(gpsResult.status).json({
          success: false,
          message: gpsResult.message,
          distanceMeters: gpsResult.distanceMeters,
          accuracyMeters: gpsResult.accuracyMeters,
        });
      }

      // 2. Generate descriptor from the current face image.
      let currentDescriptor;

      try {
        currentDescriptor = await getFaceDescriptor(faceImage);
      } catch (error) {
        return res.status(error.status || 400).json({
          success: false,
          message: error.message || "Face verification failed.",
        });
      }

      // 3. Compare with the enrolled face descriptor.
      const enrolledDescriptor =
        employee.faceEnrollment.faceDescriptor;

      if (
        !Array.isArray(enrolledDescriptor) ||
        enrolledDescriptor.length !== currentDescriptor.length
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Stored face enrollment is invalid. Please enroll your face again.",
        });
      }

      const faceDistance = calculateFaceDistance(
        enrolledDescriptor,
        currentDescriptor
      );

      if (
        !Number.isFinite(FACE_MATCH_THRESHOLD) ||
        FACE_MATCH_THRESHOLD <= 0 ||
        FACE_MATCH_THRESHOLD >= 2
      ) {
        return res.status(500).json({
          success: false,
          message: "Face verification threshold is misconfigured.",
        });
      }

      if (faceDistance > FACE_MATCH_THRESHOLD) {
        console.warn("Face verification mismatch:", {
          employeeId: String(employee._id),
          distance: Number(faceDistance.toFixed(4)),
          threshold: FACE_MATCH_THRESHOLD,
          storedDescriptorLength: enrolledDescriptor.length,
          currentDescriptorLength: currentDescriptor.length,
        });

        return res.status(403).json({
          success: false,
          code: "FACE_MISMATCH",
          message:
            "Face verification failed. Please ensure good lighting, face the camera directly, and try again.",
        });
      }

      // 4. Determine today's date and attendance status.
      const settings = await readAttendanceSettings();
      const today = getTodayDate(settings.timezone);
      const currentTime = getCurrentTime(settings.timezone);

      // Reject attendance on configured non-working days.
      const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: settings.timezone,
        weekday: "short",
      }).format(new Date());

      if (!settings.workingDays.includes(weekday)) {
        return res.status(403).json({
          success: false,
          message: "Today is not a configured working day.",
        });
      }

      // Prevent duplicate check-in.
      const existingAttendance = await Attendance.findOne({
        employeeId: employee._id,
        date: today,
      });

      if (existingAttendance?.checkIn) {
        return res.status(409).json({
          success: false,
          message: "You have already checked in today.",
          attendance: existingAttendance,
        });
      }

      const startMinutes = minutesFromTime(
        settings.officeStartTime
      );

      const currentMinutes = minutesFromTime(currentTime);

      const lateAfter =
        startMinutes + Number(settings.gracePeriodMinutes || 0);

      const attendanceStatus =
        currentMinutes > lateAfter ? "Late" : "Present";

      // Save successful GPS and face verification.
      const verificationTime = new Date();

      const attendanceData = {
        employeeId: employee._id,

        name:
          employee.name ||
          employee.fullName ||
          req.user?.name ||
          "Employee",

        department: employee.department || "Unassigned",

        date: today,

        checkIn: currentTime,

        // BUG FIX:
        // Do not carry a stale checkout time into a new check-in.
        // Employee checkout is written only by the check-out route.
        checkOut: null,

        status: attendanceStatus,

        // GPS verification details.
        location: {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          accuracy: Number(location.accuracy),
          distanceFromOffice: gpsResult.distanceMeters,
          verificationStatus: "Verified",
          verifiedAt: verificationTime,
          verificationMethod: "GPS",
        },

        // Face verification details.
        faceVerification: {
          status: "Verified",
          provider: "vladmandic-face-api",
          verifiedAt: verificationTime,
          verificationMethod: "Face Recognition",

          // The route calculates distance, not a similarity score.
          similarityScore: null,

          verificationReference: "",
        },

        // Overall verification details.
        verificationMethod: "Face + GPS",
        verificationCompleted: true,
        verifiedAt: verificationTime,
      };

      let attendance;

      if (existingAttendance) {
        existingAttendance.set(attendanceData);
        attendance = await existingAttendance.save();
      } else {
        attendance = await Attendance.create(attendanceData);
      }

      // Update employee's last successful face verification.
      employee.faceEnrollment.lastVerifiedAt = verificationTime;
      await employee.save();

      return res.status(201).json({
        success: true,
        message: "Check-in completed successfully.",
        attendance,
        verification: {
          gpsVerified: true,
          faceVerified: true,
          distanceMeters: gpsResult.distanceMeters,
          accuracyMeters: gpsResult.accuracyMeters,
        },
      });
    } catch (error) {
      console.error("Employee check-in error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to complete check-in.",
      });
    }
  }
);

// ======================================================
// EMPLOYEE CHECK-OUT
// Supports both PATCH and POST for compatibility
// ======================================================

async function handleEmployeeCheckOut(req, res) {
  try {
    const employee = await getOwnEmployee(req);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found.",
      });
    }

    const settings = await readAttendanceSettings();
    const today = getTodayDate(settings.timezone);
    const currentTime = getCurrentTime(settings.timezone);

    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      date: today,
    });

    // A genuine check-in is required before checkout.
    if (
      !attendance ||
      typeof attendance.checkIn !== "string" ||
      !isValidTime(attendance.checkIn)
    ) {
      return res.status(400).json({
        success: false,
        message: "You must check in before checking out.",
      });
    }

    // Prevent duplicate checkout.
    if (
      typeof attendance.checkOut === "string" &&
      isValidTime(attendance.checkOut)
    ) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today.",
        attendance,
      });
    }

    const workedMinutes =
      minutesFromTime(currentTime) -
      minutesFromTime(attendance.checkIn);

    if (workedMinutes < 0) {
      return res.status(400).json({
        success: false,
        message: "Check-out time cannot be earlier than check-in time.",
      });
    }

    // Only this endpoint records employee checkout.
    attendance.checkOut = currentTime;

    const minimumHalfDayMinutes =
      Number(settings.minimumHoursForHalfDay || 4) * 60;

    if (
      workedMinutes < minimumHalfDayMinutes &&
      attendance.status !== "On Leave"
    ) {
      attendance.status = "Half Day";
    } else if (
      workedMinutes >= minimumHalfDayMinutes &&
      attendance.status === "Absent"
    ) {
      attendance.status = "Present";
    }

    if (attendance.schema.path("workedMinutes")) {
      attendance.workedMinutes = workedMinutes;
    }

    await attendance.save();

    return res.json({
      success: true,
      message: "Check-out completed successfully.",
      attendance,
      workedMinutes,
      workedHours: Number((workedMinutes / 60).toFixed(2)),
      minimumFullDayMinutes:
        Number(settings.minimumWorkingHours || 8) * 60,
    });
  } catch (error) {
    console.error("Employee check-out error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete check-out.",
    });
  }
}

// The frontend currently sends PATCH.
// POST is retained for compatibility with existing callers.
router.patch(
  "/my/check-out",
  requireEmployee,
  handleEmployeeCheckOut
);

router.post(
  "/my/check-out",
  requireEmployee,
  handleEmployeeCheckOut
);
// ======================================================
// ADMIN / HR: CREATE ATTENDANCE
// POST /api/attendance
// ======================================================

router.post(
  "/",
  requireAdminOrHR,
  async (req, res) => {
    try {
      const validationError = validateAttendance(req.body);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      const attendance = await Attendance.create({
        employeeId: req.body.employeeId,
        name: req.body.name.trim(),
        department: req.body.department.trim(),
        date: req.body.date,
        checkIn: req.body.checkIn || null,
        checkOut: req.body.checkOut || null,
        status: req.body.status || "Present",
      });

      return res.status(201).json({
        success: true,
        message: "Attendance record created successfully.",
        attendance,
      });
    } catch (error) {
      console.error("Create attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create attendance record.",
      });
    }
  }
);

// ======================================================
// ADMIN / HR: UPDATE ATTENDANCE
// PUT /api/attendance/:id
// ======================================================

router.put(
  "/:id",
  requireAdminOrHR,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance record ID.",
        });
      }

      const validationError = validateAttendance(
        req.body,
        true
      );

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      const allowedFields = [
        "employeeId",
        "name",
        "department",
        "date",
        "checkIn",
        "checkOut",
        "status",
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (typeof updates.name === "string") {
        updates.name = updates.name.trim();
      }

      if (typeof updates.department === "string") {
        updates.department = updates.department.trim();
      }

      const attendance = await Attendance.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found.",
        });
      }

      return res.json({
        success: true,
        message: "Attendance record updated successfully.",
        attendance,
      });
    } catch (error) {
      console.error("Update attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update attendance record.",
      });
    }
  }
);

// ======================================================
// ADMIN / HR: PARTIAL UPDATE
// PATCH /api/attendance/:id
// ======================================================

router.patch(
  "/:id",
  requireAdminOrHR,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance record ID.",
        });
      }

      const validationError = validateAttendance(
        req.body,
        true
      );

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      const allowedFields = [
        "employeeId",
        "name",
        "department",
        "date",
        "checkIn",
        "checkOut",
        "status",
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (typeof updates.name === "string") {
        updates.name = updates.name.trim();
      }

      if (typeof updates.department === "string") {
        updates.department = updates.department.trim();
      }

      const attendance = await Attendance.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found.",
        });
      }

      return res.json({
        success: true,
        message: "Attendance record updated successfully.",
        attendance,
      });
    } catch (error) {
      console.error("Patch attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update attendance record.",
      });
    }
  }
);

// ======================================================
// ADMIN / HR: DELETE ATTENDANCE
// DELETE /api/attendance/:id
// ======================================================

router.delete(
  "/:id",
  requireAdminOrHR,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance record ID.",
        });
      }

      const attendance = await Attendance.findByIdAndDelete(
        req.params.id
      );

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found.",
        });
      }

      return res.json({
        success: true,
        message: "Attendance record deleted successfully.",
      });
    } catch (error) {
      console.error("Delete attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to delete attendance record.",
      });
    }
  }
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;