const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  username: {
    type: String,
    required: true
  },

  otp: {
    type: String,
    required: true
  },

  verified: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300  // auto delete after 5 minutes
  }
});

module.exports = mongoose.model("Otp", otpSchema);
