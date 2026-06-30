require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/garudclasses");
  console.log("Connected to MongoDB");

  const user = await User.findOne({ username: "lokesh.1@garudclasses.com" });
  if (!user) {
    console.log("Superadmin user not found");
  } else {
    await user.setPassword("Admin123!");
    await user.save();
    console.log("Successfully set password for lokesh.1@garudclasses.com to 'Admin123!'");
  }

  mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
