const mongoose = require("mongoose");
const { queryConnection } = require("../config/connections");

const FollowUpSchema = new mongoose.Schema({
  queryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Query"
  },
  createdAt: Date,
  note: String
}, { timestamps: true });

module.exports = queryConnection.model("FollowUp", FollowUpSchema);
