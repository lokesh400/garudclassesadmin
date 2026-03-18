const mongoose = require("mongoose");

const recruitmentSchema = new mongoose.Schema({
  title: String,
  department: String,
  description: String,
  experience: String,
  salaryRange: String,
  location: String,
  jdFile: String, // PDF path
  status: {
    type: String,
    enum: ["Open", "Closed"],
    default: "Open"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Recruitment", recruitmentSchema);
