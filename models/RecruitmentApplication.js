const mongoose = require("mongoose");

const recruitmentApplicationSchema = new mongoose.Schema(
  {
    recruitment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruitment",
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    totalExperience: {
      type: String,
      trim: true,
      default: "",
    },
    currentCompany: {
      type: String,
      trim: true,
      default: "",
    },
    currentCTC: {
      type: String,
      trim: true,
      default: "",
    },
    expectedCTC: {
      type: String,
      trim: true,
      default: "",
    },
    noticePeriod: {
      type: String,
      trim: true,
      default: "",
    },
    coverLetter: {
      type: String,
      trim: true,
      default: "",
    },
    resumeFile: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["New", "In Review", "Shortlisted", "Rejected", "Hired"],
      default: "New",
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

recruitmentApplicationSchema.index({ recruitment: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("RecruitmentApplication", recruitmentApplicationSchema);
