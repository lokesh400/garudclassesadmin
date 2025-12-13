const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch",},
  username: { type: String, required: true, unique: true },
  parent:{ type: String },
  rollNumber: { type: String },
  password: { type: String, required: true },
  number: { type: Number },
  role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'student' }
}, { timestamps: true });


userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
