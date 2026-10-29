
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const connectDB = require("./src/config/db");
const { createNotification } = require("./src/services/notificationService");

// Authentication and HRMS routes
const authRoutes = require("./src/routes/authRoutes");
const employeeRoutes = require("./src/routes/employeeRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
const leaveRequestRoutes = require("./src/routes/leaveRequestRoutes");
const hrDocumentRoutes = require("./src/routes/hrDocumentRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");

// Projects routes
const projectRoutes = require("./src/routes/projectRoutes");
const taskRoutes = require("./src/routes/taskRoutes");
const proposalRoutes = require("./src/routes/proposalRoutes");

// CRM routes
const clientRoutes = require("./src/routes/clientRoutes");
const leadRoutes = require("./src/routes/leadRoutes");
const contactRoutes = require("./src/routes/contactRoutes");

// Finance routes
const invoiceRoutes = require("./src/routes/invoiceRoutes");
const expenseRoutes = require("./src/routes/expenseRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");

// Assets and Assignments routes
const assetRoutes = require("./src/routes/assetRoutes");
const assignmentRoutes = require("./src/routes/assignmentRoutes");

// Support Tickets and Feedback routes
const supportTicketRoutes = require("./src/routes/supportTicketRoutes");
const feedbackRoutes = require("./src/routes/feedbackRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const allowedOrigin =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  },
});

// Make Socket.IO and notification helper available to routes
app.set("io", io);

app.set("createNotification", (data) => createNotification(io, data));

// Authenticate Socket.IO connections using JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  if (!process.env.JWT_SECRET) {
    return next(
      new Error("Server authentication is not configured")
    );
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.sub || !payload.role) {
      return next(new Error("Invalid user information"));
    }

    socket.user = {
      id: String(payload.sub),
      role: String(payload.role).toLowerCase(),
    };

    return next();
  } catch (error) {
    return next(new Error("Invalid or expired token"));
  }
});

// Private Socket.IO room for each authenticated user
io.on("connection", (socket) => {
  const { id, role } = socket.user;
  const room = `user:${role}:${id}`;

  socket.join(room);

  console.log(`Authenticated socket connected: ${role}`);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${role}`);
  });
});

// Express middleware
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: "8mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ERP API is running",
    timestamp: new Date().toISOString(),
  });
});

// Authentication and HRMS
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/hr-documents", hrDocumentRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Projects
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/proposals", proposalRoutes);

// CRM
app.use("/api/clients", clientRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/contacts", contactRoutes);

// Finance
app.use("/api/invoices", invoiceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/payments", paymentRoutes);

// Assets and Assignments
app.use("/api/assets", assetRoutes);
app.use("/api/assignments", assignmentRoutes);

// Support Tickets
app.use("/api/support-tickets", supportTicketRoutes);

// Help & Feedback
app.use("/api/feedback", feedbackRoutes);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("API Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      err.status && err.status < 500
        ? err.message
        : "Internal server error",
  });
});

// Connect MongoDB and start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(
        `ERP API + Socket.IO listening on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "Failed to connect to MongoDB:",
      error.message
    );

    process.exit(1);
  });
