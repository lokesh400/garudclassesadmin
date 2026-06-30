const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Staff = require("../models/Staff");
const User = require("../models/User");

const cleanDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for cleaning...");

    // Delete test staff with email testerstaff@garudclasses.com
    const staff = await Staff.findOne({ email: "testerstaff@garudclasses.com" });
    if (staff) {
      console.log("Found staff Tester Staff. Deleting...");
      await Staff.deleteOne({ _id: staff._id });
    }

    // Delete user Tester Staff
    const user = await User.findOne({ username: "testerstaff@garudclasses.com" });
    if (user) {
      console.log("Found user Tester Staff. Deleting...");
      await User.deleteOne({ _id: user._id });
    }

    // Also delete any other test staff
    await Staff.deleteMany({ name: /Tester/i });
    await User.deleteMany({ username: /tester/i });

    console.log("Cleanup finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
};

cleanDb();
