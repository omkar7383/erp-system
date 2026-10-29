const express = require("express");
const mongoose = require("mongoose");

const Project = require("../models/Project");
const Client = require("../models/Client");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

const VALID_STATUSES = [
  "Planning",
  "In Progress",
  "On Hold",
  "Completed",
];

function isAdminOrHR(req) {
  return ["admin", "hr"].includes(
    String(req.user?.role || "").toLowerCase()
  );
}

function isClient(req) {
  return String(req.user?.role || "").toLowerCase() === "client";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateProjectInput(body, isUpdate = false) {
  const { name, budget, status, progress, clientId } = body;

  if (!isUpdate || name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return "Project name is required.";
    }
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return "Invalid project status.";
  }

  if (budget !== undefined && budget !== "" && budget !== null) {
    if (!Number.isFinite(Number(budget)) || Number(budget) < 0) {
      return "Budget must be a valid non-negative number.";
    }
  }

  if (progress !== undefined) {
    if (
      progress === "" ||
      !Number.isFinite(Number(progress)) ||
      Number(progress) < 0 ||
      Number(progress) > 100
    ) {
      return "Progress must be between 0 and 100.";
    }
  }

  if (
    clientId !== undefined &&
    clientId !== null &&
    clientId !== "" &&
    !mongoose.isValidObjectId(clientId)
  ) {
    return "Invalid client ID.";
  }

  if (
    body.client !== undefined &&
    body.client !== null &&
    typeof body.client !== "string"
  ) {
    return "Client must be a company or client name.";
  }

  return null;
}

function buildProjectData(body, existingProject = {}) {
  const status = body.status ?? existingProject.status ?? "Planning";

  const rawProgress =
    body.progress !== undefined
      ? Number(body.progress)
      : Number(existingProject.progress ?? 0);

  return {
    name:
      body.name !== undefined
        ? body.name.trim()
        : existingProject.name,

    client:
      body.client !== undefined
        ? String(body.client ?? "").trim()
        : existingProject.client ?? "",

    clientId:
      body.clientId !== undefined
        ? body.clientId || null
        : existingProject.clientId ?? null,

    manager:
      body.manager !== undefined
        ? String(body.manager ?? "").trim()
        : existingProject.manager ?? "",

    deadline:
      body.deadline !== undefined
        ? String(body.deadline ?? "").trim()
        : existingProject.deadline ?? "",

    budget:
      body.budget !== undefined
        ? body.budget === "" || body.budget == null
          ? 0
          : Number(body.budget)
        : Number(existingProject.budget ?? 0),

    status,
    progress: status === "Completed" ? 100 : rawProgress,
  };
}

// Find the client using the company/client name selected in the existing UI.
async function resolveAndAttachClient(projectData) {
  const clientName = String(projectData.client || "").trim();

  if (projectData.clientId) {
    if (!mongoose.isValidObjectId(projectData.clientId)) {
      return { error: "Invalid client ID." };
    }

    const client = await Client.findById(projectData.clientId)
      .select("_id name company")
      .lean();

    if (!client) {
      return { error: "The selected client does not exist." };
    }

    projectData.clientId = client._id;
    projectData.client = client.company || client.name || clientName;

    return null;
  }

  if (!clientName) {
    projectData.clientId = null;
    return null;
  }

  const escapedName = escapeRegex(clientName);

  const clients = await Client.find({
    $or: [
      { company: { $regex: `^${escapedName}$`, $options: "i" } },
      { name: { $regex: `^${escapedName}$`, $options: "i" } },
    ],
  })
    .select("_id name company")
    .limit(2)
    .lean();

  if (clients.length === 0) {
    return {
      error: `No client matches "${clientName}". Check the Clients module.`,
    };
  }

  if (clients.length > 1) {
    return {
      error: `More than one client matches "${clientName}". Please ensure client/company names are unique.`,
    };
  }

  const client = clients[0];

  projectData.clientId = client._id;
  projectData.client = client.company || client.name || clientName;

  return null;
}

// Resolve the Client record linked to the logged-in account.
// Supports either a Client ID or a User ID with a matching email.
async function getLoggedInClientId(req) {
  const userId = req.user?.id;

  if (!userId) return null;

  // First try treating the authenticated ID as a Client record ID.
  if (mongoose.isValidObjectId(userId)) {
    const client = await Client.findById(userId)
      .select("_id")
      .lean();

    if (client) return client._id;
  }

  // Otherwise, the login may use a User record.
  const user = await User.findById(userId)
    .select("email")
    .lean();

  const email = user?.email || req.user?.email;

  if (!email) return null;

  const client = await Client.findOne({
    email: String(email).trim().toLowerCase(),
  })
    .select("_id")
    .lean();

  return client?._id || null;
}

// GET /api/projects
router.get("/", async (req, res, next) => {
  try {
    let filter = {};

    if (isClient(req)) {
      const clientId = await getLoggedInClientId(req);

      if (!clientId) {
        return res.status(403).json({
          success: false,
          message:
            "Your login account is not linked to a Client record. Check that the client login email matches the Clients module.",
        });
      }

      filter = { clientId };
    } else if (!isAdminOrHR(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view these projects.",
      });
    }

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    const filter = { _id: req.params.id };

    if (isClient(req)) {
      const clientId = await getLoggedInClientId(req);

      if (!clientId) {
        return res.status(403).json({
          success: false,
          message: "Your login account is not linked to a Client record.",
        });
      }

      filter.clientId = clientId;
    } else if (!isAdminOrHR(req)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this project.",
      });
    }

    const project = await Project.findOne(filter).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    return res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// CREATE project — Admin/HR only.
router.post("/", async (req, res, next) => {
  try {
    if (!isAdminOrHR(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or HR can create projects.",
      });
    }

    const validationError = validateProjectInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const projectData = buildProjectData(req.body);
    const clientError = await resolveAndAttachClient(projectData);

    if (clientError) {
      return res.status(400).json({
        success: false,
        message: clientError.error,
      });
    }

    const project = await Project.create(projectData);

    return res.status(201).json({
      success: true,
      data: project,
      message: "Project created successfully.",
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
});

// UPDATE project — Admin/HR only.
router.put("/:id", async (req, res, next) => {
  try {
    if (!isAdminOrHR(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or HR can update projects.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    const validationError = validateProjectInput(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const existingProject = await Project.findById(req.params.id);

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const projectData = buildProjectData(
      req.body,
      existingProject.toObject()
    );

    const clientError = await resolveAndAttachClient(projectData);

    if (clientError) {
      return res.status(400).json({
        success: false,
        message: clientError.error,
      });
    }

    Object.assign(existingProject, projectData);
    await existingProject.save();

    return res.json({
      success: true,
      data: existingProject,
      message: "Project updated successfully.",
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
});

// DELETE project — Admin/HR only.
router.delete("/:id", async (req, res, next) => {
  try {
    if (!isAdminOrHR(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or HR can delete projects.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    return res.json({
      success: true,
      message: "Project deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;