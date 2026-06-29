const mongoose = require("mongoose");
const { queryConnection } = require("../config/connections");

const querySchema = new mongoose.Schema(
  {
    studentName: String,
    description: String,
    mobileNumber: String,
    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },
    remarks: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

module.exports = queryConnection.model("Query", querySchema);
