const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  form: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  mobileNumber: { type: Number},
  email: { type: String},
  data: { type: Object, required: true },
  admitCardGenerated: { type: Boolean, default: false },
  attendance: { type: Boolean, default: false } // <-- add attendance field
}, { timestamps: true });

const Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
module.exports = Submission;