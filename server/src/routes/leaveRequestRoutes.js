const express = require("express");
const mongoose = require("mongoose");

const LeaveRequest = require("../models/LeaveRequest");
const Employee = require("../models/Employee");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const ALLOWED_LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Unpaid Leave",
];

// ---------------- Notification helpers ----------------

async function sendNotification(req, details) {
  const createNotification = req.app.get("createNotification");

  if (typeof createNotification !== "function") {
    console.warn(
      "Notification service is not configured. Skipping notification."
    );
    return;
  }

  try {
    await createNotification(details);
  } catch (error) {
    // A notification failure must not undo a successful leave operation.
    console.error("Leave notification error:", error.message);
  }
}

function validObjectId(id) {
  return mongoose.isValidObjectId(id);
}

// Notify an employee using the login account ID linked to their profile.
async function notifyEmployee(req, employee, title, message) {
  if (!employee?.userId || !validObjectId(String(employee.userId))) {
    console.warn(
      "Employee has no valid linked userId. Employee notification skipped."
    );
    return;
  }

  await sendNotification(req, {
    recipientId: String(employee.userId),
    recipientRole: "employee",
    title,
    message,
    type: "leave",
    link: "/employee/leaves",
  });
}

// Find Admin/HR accounts from the standard MongoDB "users" collection.
// The account _id must match the ID stored in the login JWT's sub field.
async function notifyAdminsAndHR(req, title, message) {
  try {
    const usersCollection =
      mongoose.connection.collection("users");

    const recipients = await usersCollection
      .find({
        role: {
          $in: ["admin", "hr", "Admin", "HR"],
        },
      })
      .project({ _id: 1, role: 1 })
      .toArray();

    if (!recipients.length) {
      console.warn(
        "No Admin/HR accounts found in the users collection."
      );
      return;
    }

    for (const user of recipients) {
      const role = String(user.role || "").toLowerCase();

      if (
        !["admin", "hr"].includes(role) ||
        !validObjectId(String(user._id))
      ) {
        continue;
      }

      await sendNotification(req, {
        recipientId: String(user._id),
        recipientRole: role,
        title,
        message,
        type: "leave",
        link: "/leave-requests",
      });
    }
  } catch (error) {
    console.error(
      "Could not find Admin/HR accounts for notifications:",
      error.message
    );
  }
}

// ---------------- Authorization helpers ----------------

function requireAdminOrHR(req, res, next) {
  if (!["admin", "hr"].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to manage leave requests.",
    });
  }

  next();
}

async function getOwnEmployee(req) {
  let employee = await Employee.findOne({
    userId: req.user.id,
  });

  if (!employee && req.user.email) {
    employee = await Employee.findOne({
      email: String(req.user.email).trim().toLowerCase(),
      $or: [
        { userId: { $exists: false } },
        { userId: null },
      ],
    });

    if (employee) {
      employee.userId = req.user.id;
      await employee.save();
    }
  }

  return employee;
}

function isValidDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(
      Date.parse(`${value}T00:00:00.000Z`)
    ) &&
    new Date(`${value}T00:00:00.000Z`)
      .toISOString()
      .slice(0, 10) === value
  );
}

// ---------------- GET /api/leave-requests ----------------
// Admin/HR: all requests. Employee: own requests only.

router.get("/", async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === "employee") {
      const employee = await getOwnEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Employee profile not found. Contact Admin/HR.",
        });
      }

      filter = { employeeId: employee._id };
    } else if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view leave requests.",
      });
    }

    const requests = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
});

// ---------------- POST /api/leave-requests ----------------
// Employee submits a request -> notify Admin/HR.
// Admin/HR can also create a request for an employee.

router.post("/", async (req, res, next) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;

    if (
      !leaveType ||
      !fromDate ||
      !toDate ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide leave type, dates and reason.",
      });
    }

    if (!ALLOWED_LEAVE_TYPES.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave type.",
      });
    }

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Dates must use the YYYY-MM-DD format.",
      });
    }

    if (toDate < fromDate) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be earlier than start date.",
      });
    }

    let employee;

    if (req.user.role === "employee") {
      // Do not trust employee identity supplied by the frontend.
      employee = await getOwnEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Employee profile not found. Contact Admin/HR.",
        });
      }
    } else if (["admin", "hr"].includes(req.user.role)) {
      const { employeeId, name, department } = req.body;

      if (employeeId) {
        if (!validObjectId(employeeId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid employee ID.",
          });
        }

        employee = await Employee.findById(employeeId);

        if (!employee) {
          return res.status(404).json({
            success: false,
            message: "Employee profile not found.",
          });
        }
      } else if (name?.trim() && department?.trim()) {
        employee = await Employee.findOne({
          name: name.trim(),
          department: department.trim(),
        });
      }

      if (!employee) {
        return res.status(400).json({
          success: false,
          message: "Select a valid employee profile.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to submit leave requests.",
      });
    }

    const request = await LeaveRequest.create({
      employeeId: employee._id,
      name: employee.name,
      department: employee.department,
      leaveType,
      fromDate,
      toDate,
      reason: reason.trim(),
      status: "Pending",
    });

    // Notify Admin/HR only for a request submitted by an employee.
    if (req.user.role === "employee") {
      await notifyAdminsAndHR(
        req,
        "New leave request",
        `${employee.name} submitted a ${leaveType} request from ${fromDate} to ${toDate}.`
      );
    }

    return res.status(201).json({
      success: true,
      data: request,
      message: "Leave request created successfully.",
    });
  } catch (error) {
    if (
      ["ValidationError", "CastError"].includes(error.name)
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
});
// ---------------- PATCH /api/leave-requests/:id ----------------
// Admin/HR approves or rejects a request -> notify the employee.

router.patch("/:id", requireAdminOrHR, async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave request ID.",
      });
    }

    const { status } = req.body;

    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave status.",
      });
    }

    const request = await LeaveRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
    }

    const previousStatus = request.status;

    request.status = status;
    await request.save();

    // Avoid duplicate notifications if the status hasn't changed.
    if (
      previousStatus !== status &&
      ["Approved", "Rejected"].includes(status)
    ) {
      const employee = await Employee.findById(
        request.employeeId
      );

      if (employee) {
        const title =
          status === "Approved"
            ? "Leave request approved"
            : "Leave request rejected";

        const message =
          status === "Approved"
            ? `Your ${request.leaveType} request from ${request.fromDate} to ${request.toDate} has been approved.`
            : `Your ${request.leaveType} request from ${request.fromDate} to ${request.toDate} has been rejected.`;

        await notifyEmployee(
          req,
          employee,
          title,
          message
        );
      }
    }

    return res.json({
      success: true,
      data: request,
      message: "Leave request status updated.",
    });
  } catch (error) {
    next(error);
  }
});

// ---------------- DELETE /api/leave-requests/:id ----------------
// Admin/HR only.

router.delete("/:id", requireAdminOrHR, async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave request ID.",
      });
    }

    const request = await LeaveRequest.findByIdAndDelete(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
    }

    return res.json({
      success: true,
      message: "Leave request deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;