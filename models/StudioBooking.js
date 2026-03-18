const mongoose = require("mongoose");

const studioBookingSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    studioName: {
      type: String,
      default: "Main Studio"
    },

    date: {
      type: Date,
      required: true
    },

    startTime: {
      type: String, // "10:00"
      required: true
    },

    endTime: {
      type: String, // "11:30"
      required: true
    },

    status: {
      type: String,
      enum: ["scheduled", "running", "completed", "rescheduled"],
      default: "scheduled"
    },

    rescheduledFrom: {
      type: Date
    },

    remarks: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudioBooking", studioBookingSchema);
