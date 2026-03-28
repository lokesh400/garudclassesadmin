const mongoose = require("mongoose");

const recruitmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    default: "General"
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    type: String,
    trim: true,
    default: ""
  },
  salaryRange: {
    type: String,
    trim: true,
    default: ""
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  employmentType: {
    type: String,
    enum: ["Full-time", "Part-time", "Contract", "Internship"],
    default: "Full-time"
  },
  openings: {
    type: Number,
    min: 1,
    default: 1
  },
  lastDateToApply: {
    type: Date,
    default: null
  },
  jdFile: {
    type: String,
    trim: true,
    default: ""
  },
  status: {
    type: String,
    enum: ["Open", "Closed"],
    default: "Open"
  },
}, {
  timestamps: true
});

module.exports = mongoose.model("Recruitment", recruitmentSchema);
