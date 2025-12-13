const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
  student: String,
  rollNo: String,
  testTitle: { type: String, required: true },
  examType: { type: String, required: true },
  physicsTotal: Number,
  physics: Number,
  chemistryTotal: Number,
  chemistry: Number,
  mathTotal: Number,    // for JEE
  math: Number, 
  botanyTotal: Number,  // for NEET
  botany: Number,  
  zoologyTotal: Number, // for NEET  // for NEET
  zoology: Number, // for NEET
  uploadedAt: { type: Date, default: Date.now },
});

const Marks = mongoose.model("Marks", marksSchema);
module.exports = Marks;
