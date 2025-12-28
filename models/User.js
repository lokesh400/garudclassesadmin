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
  email: String,
  image:String,
  rollNumber: String,
  number: Number,
  fatherName: String,
  motherName: String,
  address: String,
  editAllowed:Boolean,
  role: {
    type: String,
    enum: ["admin", "teacher", "student", "superadmin", "receptionist"],
    default: "student"
  }
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
