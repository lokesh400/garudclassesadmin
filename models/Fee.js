const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  mode: {
    type: String,
    enum: ["Cash", "UPI", "Bank"],
  },
  receiptNo: { type: String },
  date: { type: Date, default: Date.now }
});

const feeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  admissionFee: { type: Number, default: 0 },
  tuitionFee: { type: Number, default: 0 },
  transportFee: { type: Number, default: 0 },
  otherFee: { type: Number, default: 0 },
  payments: [paymentSchema],
  totalFee: { type: Number, default: 0 }
}, { timestamps: true });

feeSchema.pre("save", function (next) {
  this.totalFee =
    this.admissionFee +
    this.tuitionFee +
    this.transportFee +
    this.otherFee;
  next();
});

module.exports = mongoose.model("Fee", feeSchema);
