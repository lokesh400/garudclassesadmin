const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  employeeId: String,
  name: String,
  email: String,
  phone: String,
  department: String,
  designation: String,
  joiningDate: Date,
  salary: Number,
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active"
  },

  documents: {
    aadhaar: String,
    pan: String,
    resume: String,
    offerLetter: String,
    experienceLetter: String,
    photo: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Staff", staffSchema);
