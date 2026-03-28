const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    trim: true,
    default: "",
  },
  linkedUsers: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  name: {
    type: String,
    trim: true,
    default: "",
  },
  fatherName: {
    type: String,
    trim: true,
    default: "",
  },
  motherName: {
    type: String,
    trim: true,
    default: "",
  },
  email: {
    type: String,
    trim: true,
    default: "",
  },
  phone: {
    type: String,
    trim: true,
    default: "",
  },
  mobileNumber: {
    type: String,
    trim: true,
    default: "",
  },
  address: {
    type: String,
    trim: true,
    default: "",
  },
  department: {
    type: String,
    trim: true,
    default: "",
  },
  designation: {
    type: String,
    trim: true,
    default: "",
  },
  joiningDate: {
    type: Date,
    default: null,
  },
  salary: {
    type: Number,
    default: null,
  },
  aadhaarNumber: {
    type: String,
    trim: true,
    default: "",
  },
  panNumber: {
    type: String,
    trim: true,
    default: "",
  },
  bankName: {
    type: String,
    trim: true,
    default: "",
  },
  accountHolderName: {
    type: String,
    trim: true,
    default: "",
  },
  accountNumber: {
    type: String,
    trim: true,
    default: "",
  },
  ifscCode: {
    type: String,
    trim: true,
    default: "",
  },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active"
  },

  documents: {
    aadhaar: {
      type: String,
      default: "",
    },
    pan: {
      type: String,
      default: "",
    },
    resume: {
      type: String,
      default: "",
    },
    offerLetter: {
      type: String,
      default: "",
    },
    experienceLetter: {
      type: String,
      default: "",
    },
    photo: {
      type: String,
      default: "",
    },
    bankAccountPhoto: {
      type: String,
      default: "",
    },
    otherDocument: {
      type: String,
      default: "",
    },
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Staff", staffSchema);
