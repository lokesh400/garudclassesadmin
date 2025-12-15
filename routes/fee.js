const express = require("express");
const Fee = require("../models/Fee");
const PDFDocument = require("pdfkit");
const { isLoggedIn, requireRole } = require("../middleware/auth");
const router = express.Router();

/* LIST */
router.get("/", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const fees = await Fee.find()
    .populate({ path: "student", populate: { path: "batch" } });
  res.render("fees/list", { fees,
    title: "Fees",
    pageTitle: "Fees",
    activePage: "fees",
   });
});

/* STUDENT HISTORY */
router.get("/student/:studentId", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const fee = await Fee.findOne({ student: req.params.studentId })
    .populate("student");
  const paid = fee.payments.reduce((s, p) => s + p.amount, 0);
  res.render("fees/student-history", {
    fee,
    paid,
    balance: fee.totalFee - paid,
    title: "Fee History",
    pageTitle: "Fee History",
    activePage: "fees",
  });
});

/* ADD PAYMENT */
router.post("/student/:studentId/pay", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  console.log(req.body,req.params.studentId);
  const fee = await Fee.findOne({ student: req.params.studentId });
  fee.payments.push({
    amount: req.body.amount,
    mode: req.body.mode,
    // receiptNo: "RCPT-" + Date.now()
  });
  await fee.save();
  res.redirect(`/fees/student/${req.params.studentId}`);
});

/* EDIT PAYMENT */
router.post("/payment/:feeId/:paymentId/edit", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const fee = await Fee.findById(req.params.feeId);
  const p = fee.payments.id(req.params.paymentId);
  p.amount = req.body.amount;
  p.mode = req.body.mode;
  await fee.save();
  res.redirect(`/fees/student/${req.params.studentId}`);
});

/* DELETE PAYMENT */
router.post("/payment/:feeId/:paymentId/delete", async (req, res) => {
  const fee = await Fee.findById(req.params.feeId);
  fee.payments.id(req.params.paymentId).remove();
  await fee.save();
  res.redirect(`/fees/student/${req.params.studentId}`);
});

/* PDF RECEIPT */
router.get("/receipt/:feeId/:paymentId", async (req, res) => {
  const fee = await Fee.findById(req.params.feeId).populate("student");
  const p = fee.payments.id(req.params.paymentId);

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  doc.fontSize(18).text("Fee Receipt", { align: "center" });
  doc.moveDown();
  doc.text(`Student: ${fee.student.name}`);
  doc.text(`Receipt: ${p.receiptNo}`);
  doc.text(`Amount: ₹${p.amount}`);
  doc.text(`Mode: ${p.mode}`);
  doc.text(`Date: ${p.date.toDateString()}`);
  doc.end();
});

module.exports = router;
