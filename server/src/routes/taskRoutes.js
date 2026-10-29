const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const Project = require("../models/Project");
const Employee = require("../models/Employee");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

// =====================================================
// CONSTANTS & HELPERS
// =====================================================

const ALLOWED_STATUSES = [
  "To Do",
  "Pending",
  "In Progress",
  "Completed",
  "On Hold",
];

const ALLOWED_PRIORITIES = ["High", "Medium", "Low"];

const isValidId = (id) => mongoose.isValidObjectId(id);

// Keep compatibility with existing tasks that use Pending.
function normalizeTaskStatus(status) {
  if (!status || status === "Pending") {
    return "To Do";
  }

  return status;
}

// Normalize the status shown to the frontend without changing
// the stored document merely because it was fetched.
function formatTask(task) {
  if (!task) return task;

  const data =
    typeof task.toObject === "function"
      ? task.toObject()
      : { ...task };

  data.status = normalizeTaskStatus(data.status);

  return data;
}

function formatTasks(tasks) {
  return Array.isArray(tasks) ? tasks.map(formatTask) : [];
}

function getRequestStatus(status) {
  if (status === undefined) {
    return undefined;
  }

  if (typeof status !== "string") {
    return null;
  }

  const normalized = status.trim();

  if (normalized === "Pending") {
    return "To Do";
  }

  if (!ALLOWED_STATUSES.includes(normalized)) {
    return null;
  }

  return normalized;
}

// =====================================================
// NOTIFICATION HELPERS
// =====================================================

// Send a notification without breaking the task operation
// if the notification service fails.
async function notifyUser(req, details) {
  const createNotification = req.app.get("createNotification");

  if (typeof createNotification !== "function") {
    console.warn(
      "Notification service is not configured; skipping notification."
    );

    return;
  }

  try {
    await createNotification(details);
  } catch (error) {
    console.error("Task notification error:", error.message);
  }
}

// Notify employees when a task is assigned to them.
async function notifyAssignedEmployees(
  req,
  employees,
  task,
  projectName
) {
  const recipients = new Map();

  for (const employee of employees || []) {
    // userId must match the ID used in the employee's login JWT.
    if (
      employee?.userId &&
      isValidId(String(employee.userId))
    ) {
      recipients.set(String(employee.userId), employee);
    }
  }

  for (const [recipientId] of recipients) {
    await notifyUser(req, {
      recipientId,
      recipientRole: "employee",
      title: "New task assigned",
      message: `You have been assigned "${task.title}"${
        projectName ? ` for project ${projectName}` : ""
      }.`,
      type: "task",
      link: "/employee",
    });
  }
}

// =====================================================
// EMPLOYEE HELPERS
// =====================================================

// Find the employee profile linked to the logged-in account.
async function getCurrentEmployee(req) {
  let employee = await Employee.findOne({
    userId: req.user.id,
  });

  // Fallback for older employee records.
  if (!employee && req.user.email) {
    employee = await Employee.findOne({
      email: req.user.email.toLowerCase(),
    });
  }

  return employee;
}

// =====================================================
// POPULATION HELPERS
// =====================================================

function populateTask(query) {
  return query
    .populate("projectId", "name")
    .populate("assigneeIds", "name employeeId email userId")
    .populate("assigneeId", "name employeeId email userId");
}

function getEmployeeNames(employees) {
  return employees
    .map(
      (employee) =>
        employee.name || employee.email || "Unnamed employee"
    )
    .join(", ");
}

// =====================================================
// REFERENCE VALIDATION
// =====================================================

// Validate project and employee IDs before creating or updating
// task assignments.
async function getValidatedReferences(projectId, assigneeIds) {
  if (!projectId || !isValidId(projectId)) {
    return {
      error: "Please select a valid project.",
    };
  }

  if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) {
    return {
      error: "Please select at least one employee.",
    };
  }

  const uniqueIds = [...new Set(assigneeIds.map(String))];

  if (uniqueIds.some((id) => !isValidId(id))) {
    return {
      error: "One or more employee IDs are invalid.",
    };
  }

  const [project, employees] = await Promise.all([
    Project.findById(projectId),
    Employee.find({
      _id: { $in: uniqueIds },
    }),
  ]);

  if (!project) {
    return {
      error: "Selected project was not found.",
    };
  }

  if (employees.length !== uniqueIds.length) {
    return {
      error: "One or more selected employees were not found.",
    };
  }

  return {
    project,
    employees,
  };
}

// =====================================================
// GET /api/tasks/my
// GET TASKS ASSIGNED TO THE LOGGED-IN EMPLOYEE
// =====================================================

router.get("/my", async (req, res) => {
  try {
    if (!isValidId(req.user.id)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user account.",
      });
    }

    const employee = await getCurrentEmployee(req);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Employee profile not found. Link the login account to the employee profile.",
      });
    }

    const tasks = await populateTask(
      Task.find({
        $or: [
          { assigneeIds: employee._id },
          { assigneeId: employee._id },
        ],
      }).sort({ createdAt: -1 })
    );

    return res.json({
      success: true,
      data: formatTasks(tasks),
    });
  } catch (error) {
    console.error("Fetch my tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your tasks.",
    });
  }
});

// =====================================================
// PATCH /api/tasks/:id/my-status
// EMPLOYEE UPDATES THEIR OWN ASSIGNED TASK STATUS
// =====================================================

router.patch("/:id/my-status", async (req, res) => {
  try {
    const { id } = req.params;
    const requestedStatus = getRequestStatus(req.body.status);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    if (requestedStatus === null || requestedStatus === undefined) {
      return res.status(400).json({
        success: false,
        message: `Invalid task status. Allowed statuses: ${ALLOWED_STATUSES.join(
          ", "
        )}.`,
      });
    }

    const employee = await getCurrentEmployee(req);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found.",
      });
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { assigneeIds: employee._id },
          { assigneeId: employee._id },
        ],
      },
      {
        $set: {
          status: requestedStatus,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found or not assigned to you.",
      });
    }

    // Notify the employee that their task status was updated.
    await notifyUser(req, {
      recipientId: req.user.id,
      recipientRole: "employee",
      title: "Task status updated",
      message: `"${task.title}" is now ${normalizeTaskStatus(
        task.status
      )}.`,
      type: "task",
      link: "/employee",
    });

    const savedTask = await populateTask(
      Task.findById(task._id)
    );

    return res.json({
      success: true,
      message: "Task status updated successfully.",
      data: formatTask(savedTask),
    });
  } catch (error) {
    console.error("Update employee task status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update task status.",
    });
  }
});

// =====================================================
// GET /api/tasks
// GET ALL TASKS
// =====================================================

router.get("/", async (req, res) => {
  try {
    const tasks = await populateTask(
      Task.find().sort({ createdAt: -1 })
    );

    return res.json(formatTasks(tasks));
  } catch (error) {
    console.error("Fetch tasks error:", error);

    return res.status(500).json({
      message: "Failed to fetch tasks.",
    });
  }
});

// =====================================================
// GET /api/tasks/:id
// GET A SINGLE TASK
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid task ID.",
      });
    }

    const task = await populateTask(
      Task.findById(req.params.id)
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.json(formatTask(task));
  } catch (error) {
    console.error("Fetch task error:", error);

    return res.status(500).json({
      message: "Failed to fetch task.",
    });
  }
});

// =====================================================
// POST /api/tasks
// CREATE A NEW TASK
// =====================================================

router.post("/", async (req, res) => {
  try {
    const {
      title,
      projectId,
      assigneeIds,
      assigneeId,
      dueDate,
      priority,
      status,
    } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required.",
      });
    }

    // Support both multi-employee and legacy single-employee
    // assignment.
    const selectedIds =
      Array.isArray(assigneeIds) && assigneeIds.length
        ? assigneeIds
        : assigneeId
        ? [assigneeId]
        : [];

    const refs = await getValidatedReferences(
      projectId,
      selectedIds
    );

    if (refs.error) {
      return res.status(400).json({
        message: refs.error,
      });
    }

    const normalizedStatus =
      status === undefined ? "To Do" : getRequestStatus(status);

    if (normalizedStatus === null || normalizedStatus === undefined) {
      return res.status(400).json({
        message: `Invalid task status. Allowed statuses: ${ALLOWED_STATUSES.join(
          ", "
        )}.`,
      });
    }

    const selectedPriority =
      priority === undefined ? "Medium" : priority;

    if (!ALLOWED_PRIORITIES.includes(selectedPriority)) {
      return res.status(400).json({
        message: `Invalid priority. Allowed priorities: ${ALLOWED_PRIORITIES.join(
          ", "
        )}.`,
      });
    }

    const task = await Task.create({
      title: title.trim(),
      projectId: refs.project._id,
      project: refs.project.name,

      assigneeIds: refs.employees.map(
        (employee) => employee._id
      ),

      // Retain the legacy field when there is exactly one assignee.
      assigneeId:
        refs.employees.length === 1
          ? refs.employees[0]._id
          : undefined,

      assignee: getEmployeeNames(refs.employees),
      dueDate: dueDate || "",
      priority: selectedPriority,
      status: normalizedStatus,
    });

    const savedTask = await populateTask(
      Task.findById(task._id)
    );

    await notifyAssignedEmployees(
      req,
      refs.employees,
      task,
      refs.project.name
    );

    return res.status(201).json(formatTask(savedTask));
  } catch (error) {
    console.error("Create task error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create task.",
    });
  }
});

// =====================================================
// PUT /api/tasks/:id
// PATCH /api/tasks/:id
// UPDATE AN EXISTING TASK
// =====================================================

async function updateTask(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid task ID.",
      });
    }

    const existingTask = await Task.findById(req.params.id);

    if (!existingTask) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    const {
      title,
      projectId,
      assigneeIds,
      assigneeId,
      dueDate,
      priority,
      status,
    } = req.body;

    const updates = {};

    // -----------------------------
    // Validate task title
    // -----------------------------

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: "Task title is required.",
        });
      }

      updates.title = title.trim();
    }

    // -----------------------------
    // Validate due date
    // -----------------------------

    if (dueDate !== undefined) {
      if (
        typeof dueDate !== "string" &&
        dueDate !== null
      ) {
        return res.status(400).json({
          message: "Invalid due date.",
        });
      }

      updates.dueDate = dueDate || "";
    }

    // -----------------------------
    // Validate priority
    // -----------------------------

    if (priority !== undefined) {
      if (!ALLOWED_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          message: `Invalid priority. Allowed priorities: ${ALLOWED_PRIORITIES.join(
            ", "
          )}.`,
        });
      }

      updates.priority = priority;
    }

    // -----------------------------
    // Validate task status
    // -----------------------------

    if (status !== undefined) {
      const normalizedStatus = getRequestStatus(status);

      if (
        normalizedStatus === null ||
        normalizedStatus === undefined
      ) {
        return res.status(400).json({
          message: `Invalid task status. Allowed statuses: ${ALLOWED_STATUSES.join(
            ", "
          )}.`,
        });
      }

      updates.status = normalizedStatus;
    }

    // -----------------------------
    // Handle project and assignees
    // -----------------------------

    const assignmentChanged =
      projectId !== undefined ||
      assigneeIds !== undefined ||
      assigneeId !== undefined;

    let refs = null;

    if (assignmentChanged || !existingTask.projectId) {
      const nextProjectId =
        projectId !== undefined
          ? projectId
          : existingTask.projectId;

      let nextAssigneeIds;

      if (Array.isArray(assigneeIds)) {
        nextAssigneeIds = assigneeIds;
      } else if (assigneeId !== undefined) {
        nextAssigneeIds = assigneeId
          ? [assigneeId]
          : [];
      } else if (existingTask.assigneeIds?.length) {
        nextAssigneeIds = existingTask.assigneeIds.map(
          String
        );
      } else if (existingTask.assigneeId) {
        nextAssigneeIds = [
          String(existingTask.assigneeId),
        ];
      } else {
        nextAssigneeIds = [];
      }

      refs = await getValidatedReferences(
        nextProjectId,
        nextAssigneeIds
      );

      if (refs.error) {
        return res.status(400).json({
          message: refs.error,
        });
      }

      updates.projectId = refs.project._id;
      updates.project = refs.project.name;

      updates.assigneeIds = refs.employees.map(
        (employee) => employee._id
      );

      updates.assigneeId =
        refs.employees.length === 1
          ? refs.employees[0]._id
          : undefined;

      updates.assignee = getEmployeeNames(refs.employees);
    }

    // -----------------------------
    // Save changes
    // -----------------------------

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    const savedTask = await populateTask(
      Task.findById(task._id)
    );

    // -----------------------------
    // Notify newly assigned employees
    // -----------------------------

    if (assignmentChanged && refs) {
      const oldAssigneeIds = new Set([
        ...(existingTask.assigneeIds || []).map(String),
        ...(existingTask.assigneeId
          ? [String(existingTask.assigneeId)]
          : []),
      ]);

      const newlyAssigned = refs.employees.filter(
        (employee) =>
          !oldAssigneeIds.has(String(employee._id))
      );

      await notifyAssignedEmployees(
        req,
        newlyAssigned,
        task,
        refs.project.name
      );
    }

    return res.json(formatTask(savedTask));
  } catch (error) {
    console.error("Update task error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update task.",
    });
  }
}

router.put("/:id", updateTask);
router.patch("/:id", updateTask);

// =====================================================
// DELETE /api/tasks/:id
// DELETE A TASK
// =====================================================

router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid task ID.",
      });
    }

    const task = await Task.findByIdAndDelete(
      req.params.id
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      message: "Failed to delete task.",
    });
  }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;