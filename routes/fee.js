const express = require("express");
const router = express.Router();
const Fee = require("../models/Fee");
const {Student:User} = require("../models/User");
const Batch = require("../models/Batch");

// Render all students with fee summary
router.get("/all/fees/view", async (req, res) => {
  try {
    // Fetch all students with role "student" and populate batch name
    const students = await User.find({ role: "student" }).populate("batch", "name");

    // Build fee summary
    const feeSummary = await Promise.all(
      students.map(async (student) => {
        const fee = await Fee.findOne({ student: student._id });
        const totalFee = fee ? fee.totalFee : 0;
        const paid = fee ? fee.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
        const balance = totalFee - paid;

        return {
          student,
          totalFee,
          paid,
          balance
        };
      })
    );

    // ✅ Render the correct object
    res.render("students/fees", { feeSummary });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


// Add fee payment for a student
router.post("/fee/:studentId/pay", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { amount, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ ok: false, error: "Amount must be greater than 0" });
    }

    const fee = await Fee.findOne({ student: studentId });
    if (!fee) {
      return res.status(404).json({ ok: false, error: "Fee record not found for student" });
    }

    // Add payment
    fee.payments.push({ amount, method });
    await fee.save();

    res.json({ ok: true, fee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get student fee info
router.get("/fee/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const fee = await Fee.findOne({ student: studentId }).populate("student", "name rollNumber");
    if (!fee) return res.status(404).json({ ok: false, error: "Fee record not found" });

    res.json({ ok: true, fee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


module.exports = router;
