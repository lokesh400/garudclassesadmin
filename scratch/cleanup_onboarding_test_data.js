const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Staff = require("../models/Staff");
const User = require("../models/User");

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Cleaning up test data...");

  // Delete test staff records
  const staffResult = await Staff.deleteMany({
    email: { $in: ["onboardtest@garudclasses.com", "testerstaff@garudclasses.com"] }
  });
  console.log(`Deleted ${staffResult.deletedCount} test Staff records`);

  // Delete test user accounts
  const userResult = await User.deleteMany({
    username: { $in: ["onboardtest@garudclasses.com", "testerstaff@garudclasses.com"] }
  });
  console.log(`Deleted ${userResult.deletedCount} test User records`);

  await mongoose.connection.close();
  console.log("✅ Cleanup complete. Database connection closed.");
}

cleanup().catch(err => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
