require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/garudclasses");
  console.log("Connected to MongoDB");

  const admins = await User.find({ role: { $in: ["admin", "superadmin"] } });
  console.log("Found Admins/Superadmins:");
  admins.forEach(admin => {
    console.log(`- Username: ${admin.username}, Name: ${admin.name}, Role: ${admin.role}`);
  });

  mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
