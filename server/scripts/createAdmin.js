
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "admin@erp.com";
    const password = "Admin@123";

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.role = "admin";
      await existingUser.save();
      console.log("Existing account updated to admin.");
    } else {
      const passwordHash = await bcrypt.hash(password, 12);

      await User.create({
        name: "ERP Administrator",
        email,
        passwordHash,
        role: "admin"
      });

      console.log("Admin account created successfully.");
    }
  } catch (error) {
    console.error("Admin setup failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
