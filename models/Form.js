const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: String},
  time: { type: String},
  mobileNumber: { type: Number},
  email: { type: String},
  admitCardGenerated: { type: Boolean, default: false },
  fields: [
    {
      label: { type: String, required: true },
      type: { type: String, enum: ["text", "email", "number", "date"], required: true },
      required: { type: Boolean, default: false }
    }
  ],
}, { timestamps: true });

const Form = mongoose.models.Form || mongoose.model("Form", formSchema);

module.exports = Form;