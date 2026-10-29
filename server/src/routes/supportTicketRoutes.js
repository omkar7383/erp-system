
const express = require("express");
const mongoose = require("mongoose");

const SupportTicket = require("../models/SupportTicket");
const Client = require("../models/Client");
const Employee = require("../models/Employee");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const getRole = (req) =>
  String(req.user?.role || "").toLowerCase();

const getUserId = (req) => req.user?.id;

const isAdmin = (req) =>
  ["admin", "hr"].includes(getRole(req));

const isClient = (req) => getRole(req) === "client";

const isEmployee = (req) => getRole(req) === "employee";

const validId = (id) => mongoose.isValidObjectId(id);

// Notifications must not prevent ticket operations from succeeding.
async function sendNotification(req, data) {
  try {
    const createNotification = req.app.get("createNotification");

    if (typeof createNotification !== "function") {
      console.error(
        "Notification service is not configured in server.js."
      );
      return;
    }

    await createNotification(data);
  } catch (error) {
    console.error(
      "Support ticket notification failed:",
      error.message
    );
  }
}

// Employee profile ID is different from employee login User ID.
async function getEmployeeProfile(req) {
  const userId = getUserId(req);

  if (!validId(userId)) return null;

  return Employee.findOne({ userId });
}

// CLIENT: Create a support ticket.
router.post("/", async (req, res) => {
  try {
    if (!isClient(req)) {
      return res.status(403).json({
        success: false,
        message: "Only clients can create tickets.",
      });
    }

    const { subject, description, category, priority } = req.body;
    const clientId = getUserId(req);

    if (!validId(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject and description are required.",
      });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const allowedCategories = [
      "Technical Issue",
      "Project Issue",
      "Billing",
      "Account",
      "Other",
    ];

    const allowedPriorities = [
      "Low",
      "Medium",
      "High",
      "Urgent",
    ];

    if (category && !allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket category.",
      });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket priority.",
      });
    }

    const ticket = await SupportTicket.create({
      ticketNumber:
        `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      clientId: client._id,
      clientName: client.name,
      subject: subject.trim(),
      description: description.trim(),
      category: category || "Other",
      priority: priority || "Medium",
      status: "Open",
    });

    // Notify Admin/HR accounts about the new ticket.
    try {
      const staffUsers = await User.find({
        role: { $in: ["admin", "hr"] },
      }).select("_id role");

      await Promise.all(
        staffUsers.map((staffUser) =>
          sendNotification(req, {
            recipientId: staffUser._id,
            recipientRole: staffUser.role,
            title: "New Support Ticket",
            message:
              `${ticket.ticketNumber} was submitted by ` +
              `${ticket.clientName}: ${ticket.subject}`,
            type: "support-ticket",
            link: "/support-tickets",
          })
        )
      );
    } catch (notificationError) {
      console.error(
        "Admin/HR notification failed:",
        notificationError.message
      );
    }

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Create support ticket:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create support ticket.",
    });
  }
});

// CLIENT: Own tickets
// EMPLOYEE: Tickets assigned to their employee profile
// ADMIN/HR: All tickets
router.get("/", async (req, res) => {
  try {
    let filter = {};

    if (isClient(req)) {
      filter.clientId = getUserId(req);
    } else if (isEmployee(req)) {
      const employee = await getEmployeeProfile(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found for this login.",
        });
      }

      filter.assignedTo = employee._id;
    } else if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const tickets = await SupportTicket.find(filter)
      .populate("assignedTo", "name email employeeId")
      .populate("handledByAdmin", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error("Fetch support tickets:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch support tickets.",
    });
  }
});

// View one ticket.
router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    const ticket = await SupportTicket.findById(req.params.id)
      .populate("assignedTo", "name email employeeId")
      .populate("handledByAdmin", "name email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    if (
      isClient(req) &&
      String(ticket.clientId) !== String(getUserId(req))
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this ticket.",
      });
    }

    if (isEmployee(req)) {
      const employee = await getEmployeeProfile(req);

      if (
        !employee ||
        String(ticket.assignedTo?._id || ticket.assignedTo) !==
          String(employee._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "This ticket is not assigned to you.",
        });
      }
    } else if (!isClient(req) && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    return res.json({ success: true, ticket });
  } catch (error) {
    console.error("Fetch support ticket:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch support ticket.",
    });
  }
});

// ADMIN/HR: Assign ticket to an employee or handle it personally.
// Frontend may send employeeId or assignedTo (compatibility).
router.patch("/:id/assign", async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only admin/HR can assign tickets.",
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    const employeeId = req.body.employeeId || req.body.assignedTo;
    const { assignToSelf, resolutionNote } = req.body;
    let requestedStatus = req.body.status;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const allowedStatuses = [
      "Open",
      "Assigned",
      "In Progress",
      "Resolved",
      "Closed",
    ];

    let assignedEmployee = null;
    ticket.assignedBy = getUserId(req);

    if (assignToSelf === true || !employeeId) {
      ticket.assignedTo = null;
      ticket.handledByAdmin = getUserId(req);
      requestedStatus = requestedStatus || "In Progress";
    } else {
      if (!validId(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "A valid employee profile ID is required.",
        });
      }

      const employee = await Employee.findById(employeeId);

      if (
        !employee ||
        String(employee.status || "").toLowerCase() === "inactive"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Active employee profile not found for the selected employee.",
        });
      }

      ticket.assignedTo = employee._id;
      ticket.handledByAdmin = null;
      assignedEmployee = employee;

      if (!requestedStatus || requestedStatus === "Open") {
        requestedStatus = "Assigned";
      }
    }

    if (!allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status.",
      });
    }

    const finalNote =
      resolutionNote !== undefined
        ? resolutionNote
        : ticket.resolutionNote || "";

    if (
      requestedStatus === "Resolved" &&
      (typeof finalNote !== "string" || !finalNote.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "A resolution note is required to resolve a ticket.",
      });
    }

    if (resolutionNote !== undefined) {
      if (typeof resolutionNote !== "string") {
        return res.status(400).json({
          success: false,
          message: "Resolution note must be text.",
        });
      }

      ticket.resolutionNote = resolutionNote.trim();
    }

    ticket.status = requestedStatus;
    ticket.resolvedAt =
      requestedStatus === "Resolved" ? new Date() : null;

    await ticket.save();

    const savedTicket = await SupportTicket.findById(ticket._id)
      .populate("assignedTo", "name email employeeId")
      .populate("handledByAdmin", "name email");

    // Employee notification recipient must be the login User ID.
    if (assignedEmployee?.userId) {
      await sendNotification(req, {
        recipientId: assignedEmployee.userId,
        recipientRole: "employee",
        title: "Support Ticket Assigned",
        message:
          `Ticket ${ticket.ticketNumber} has been assigned to you: ` +
          ticket.subject,
        type: "support-ticket",
        link: "/support-tickets",
      });
    } else if (assignedEmployee) {
      console.warn(
        `Employee ${assignedEmployee._id} has no userId; ` +
        "assignment notification was not sent."
      );
    }

    // Notify the client that assignment/status changed.
    await sendNotification(req, {
      recipientId: ticket.clientId,
      recipientRole: "client",
      title: "Support Ticket Update",
      message: assignedEmployee
        ? `Your ticket ${ticket.ticketNumber} has been assigned to ` +
          `${assignedEmployee.name || "a support team member"}. ` +
          `Status: ${ticket.status}.`
        : `Your ticket ${ticket.ticketNumber} is being handled by ` +
          `the support team. Status: ${ticket.status}.`,
      type: "support-ticket",
      link: "/client/tickets",
    });

    return res.json({
      success: true,
      message: assignedEmployee
        ? "Ticket sent to employee successfully."
        : "Ticket assignment updated.",
      ticket: savedTicket,
    });
  } catch (error) {
    console.error("Assign support ticket:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign support ticket.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

// ADMIN/HR or the assigned employee: Update ticket status.
router.patch("/:id/status", async (req, res) => {
  try {
    if (!isAdmin(req) && !isEmployee(req)) {
      return res.status(403).json({
        success: false,
        message: "You cannot update ticket status.",
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    const { status, resolutionNote } = req.body;

    const allowedStatuses = [
      "Assigned",
      "In Progress",
      "Resolved",
      "Closed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status.",
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    if (isEmployee(req)) {
      const employee = await getEmployeeProfile(req);

      if (
        !employee ||
        String(ticket.assignedTo?._id || ticket.assignedTo) !==
          String(employee._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only update tickets assigned to you.",
        });
      }
    }

    if (
      status === "Resolved" &&
      (
        typeof resolutionNote !== "string" ||
        !resolutionNote.trim()
      ) &&
      !ticket.resolutionNote?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A resolution note is required to resolve a ticket.",
      });
    }

    if (resolutionNote !== undefined) {
      if (typeof resolutionNote !== "string") {
        return res.status(400).json({
          success: false,
          message: "Resolution note must be text.",
        });
      }

      ticket.resolutionNote = resolutionNote.trim();
    }

    ticket.status = status;
    ticket.resolvedAt =
      status === "Resolved" ? new Date() : null;

    await ticket.save();

    await sendNotification(req, {
      recipientId: ticket.clientId,
      recipientRole: "client",
      title: "Support Ticket Status Updated",
      message: `Your ticket ${ticket.ticketNumber} is now ${status}.`,
      type: "support-ticket",
      link: "/client/tickets",
    });

    return res.json({
      success: true,
      message: "Ticket status updated.",
      ticket,
    });
  } catch (error) {
    console.error("Update support ticket:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update ticket status.",
    });
  }
});

module.exports = router;
