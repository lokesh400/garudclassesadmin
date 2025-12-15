const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  mode: { type: String, enum: ["Cash", "UPI", "Bank"], required: true },
  receiptNo: { type: String },
  date: { type: Date, default: Date.now }
});

// MAIN FEE SCHEMA
const feeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    admissionFee: { type: Number, default: 0, min: 0 },
    tuitionFee: { type: Number, default: 0, min: 0 },
    transportFee: { type: Number, default: 0, min: 0 },
    otherFee: { type: Number, default: 0, min: 0 },

    payments: [paymentSchema],

    totalFee: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// AUTO CALCULATE TOTAL AMOUNT
feeSchema.pre("save", function (next) {

  this.totalFee =
    this.admissionFee +
    this.tuitionFee +
    this.transportFee +
    this.otherFee;

  this.totalPaid = this.payments.reduce((acc, p) => acc + p.amount, 0);

  this.balance = this.totalFee - this.totalPaid;

  next();
});

// METHOD TO ADD PAYMENT
feeSchema.methods.addPayment = function (payment) {
  this.payments.push(payment);
  this.totalPaid = this.payments.reduce((acc, p) => acc + p.amount, 0);
  this.balance = this.totalFee - this.totalPaid;
  return this.save();
};

module.exports = mongoose.model("Fee", feeSchema);
