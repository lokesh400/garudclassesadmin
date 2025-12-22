const mongoose = require("mongoose");

const FollowUpSchema = new mongoose.Schema({
  queryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Query"
  },
  createdAt: Date,
  note: String
}, { timestamps: true });

module.exports = mongoose.model("FollowUp", FollowUpSchema);
