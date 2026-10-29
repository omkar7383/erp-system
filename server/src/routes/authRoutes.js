
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Client = require("../models/Client");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
}

// Employee registration — existing functionality preserved
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: "employee",
    });

    return res.status(201).json({
      success: true,
      message: "Account created",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login — supports existing User accounts and Client accounts
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // First check existing User accounts (Admin and Employee).
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    if (user) {
      const validPassword = await bcrypt.compare(
        password,
        user.passwordHash || ""
      );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      return res.json({
        success: true,
        message: "Login successful",
        token: createToken(user),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    // If no User account exists, check the Client collection.
    const client = await Client.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    if (!client) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const clientPasswordValid = await client.comparePassword(password);

    if (!clientPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Issue a token with the client role.
    const clientForToken = {
      _id: client._id,
      name: client.name,
      email: client.email,
      role: "client",
    };

    return res.json({
      success: true,
      message: "Login successful",
      token: createToken(clientForToken),
      user: {
        id: client._id,
        name: client.name,
        email: client.email,
        role: "client",
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
