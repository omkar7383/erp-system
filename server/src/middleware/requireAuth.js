
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  // Validate authorization header
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  // Validate server configuration
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Authentication is not configured on the server",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Validate token identity
    if (
      !payload.sub ||
      !payload.role ||
      !mongoose.isValidObjectId(payload.sub)
    ) {
      return res.status(401).json({
        success: false,
        message: "Token contains invalid user information",
      });
    }

    const role = String(payload.role).trim().toLowerCase();

    const allowedRoles = [
      "admin",
      "hr",
      "employee",
      "client",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "User role is not authorized",
      });
    }

    // Attach authenticated user to the request
    req.user = {
      id: String(payload.sub),
      role,
      email:
        typeof payload.email === "string"
          ? payload.email
          : null,
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token is invalid or expired",
    });
  }
}

module.exports = requireAuth;
