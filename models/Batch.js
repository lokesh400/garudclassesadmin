const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  courseType: { type: String, enum: ["JEE", "NEET"], required: true },
  year: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Batch = mongoose.model("Batch", batchSchema);
module.exports = Batch;
