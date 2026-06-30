const mongoose = require("mongoose");

const onboardingSchema = new mongoose.Schema({
  // Linked login account (created at registration)
  linkedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Basic Info
  name: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  alternatePhone: { type: String, trim: true, default: "" },
  fatherName: { type: String, trim: true, default: "" },
  motherName: { type: String, trim: true, default: "" },
  address: { type: String, trim: true, default: "" },
  aadhaarNumber: { type: String, trim: true, default: "" },
  panNumber: { type: String, trim: true, default: "" },

  // Role / Department
  department: { type: String, trim: true, default: "" },
  designation: { type: String, trim: true, default: "" },
  intendedRole: { type: String, default: "teacher" }, // role to assign on transfer
  subjects: { type: [String], default: [] },

  // Bank Details
  bankName: { type: String, trim: true, default: "" },
  accountHolderName: { type: String, trim: true, default: "" },
  accountNumber: { type: String, trim: true, default: "" },
  ifscCode: { type: String, trim: true, default: "" },

  // Offer Letter
  offerStatus: {
    type: String,
    enum: ["None", "Sent", "Accepted", "Rejected"],
    default: "None"
  },
  offerDesignation: { type: String, default: "" },
  offerSalary: { type: String, default: "" },
  offerJoiningDate: { type: Date, default: null },
  digitalSignature: { type: String, default: "" },
  offerSignedAt: { type: Date, default: null },

  // Documents (Cloudinary URLs)
  documents: {
    photo: { type: String, default: "" },
    resume: { type: String, default: "" },
    aadhaar: { type: String, default: "" },
    pan: { type: String, default: "" },
    bankAccountPhoto: { type: String, default: "" },
    experienceLetter: { type: String, default: "" },
    otherDocument: { type: String, default: "" }
  },

  // Overall onboarding status
  onboardingStatus: {
    type: String,
    enum: ["Pending", "Offer Sent", "Offer Accepted", "Complete"],
    default: "Pending"
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Onboarding", onboardingSchema);
