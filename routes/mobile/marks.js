const express = require("express");
const Marks = require("../../models/Marks");
const User = require("../../models/User");
const router = express.Router();

/**
 * POST /api/marks/all
 * BODY: { studentId }
 * Returns ALL tests of this student
 */
router.post("/all/:studentId", async (req, res) => {
  try {
    console.log("Fetching marks for studentId:", req.params.studentId);

    if (!req.params.studentId)
      return res.status(400).json({ message: "studentId required" });

    // find student -> get batch + name / rollNo
    const student = await User.findById(req.params.studentId);
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    // find all tests of this rollNo OR student name
    const marks = await Marks.find({
      student: student.name, // or student.username
      batch: student.batch,
    }).sort({ uploadedAt: -1 });

    res.json({ marks });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
