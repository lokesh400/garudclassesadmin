const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch"
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  isActive:{
    type:Boolean,
    default:true
  },
  email: String,
  image:String,
  rollNumber: String,
  number: Number,
  fatherName: String,
  motherName: String,
  address: String,
  editAllowed:Boolean,
  allowPhotoReupload: { type: Boolean, default: false },
  allowDocumentReupload: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ["admin", "teacher", "student", "superadmin", "receptionist", "hr", "mts"],
    default: "student"
  },
  class10Marksheet: { url: String, publicId: String },
  class12Marksheet: { url: String, publicId: String },
  aadharCard: { url: String, publicId: String },
  fatherAadharCard: { url: String, publicId: String },
  motherAadharCard: { url: String, publicId: String }
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
