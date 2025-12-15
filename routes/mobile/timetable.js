const express = require("express");
const Timetable = require("../../models/Timetable");
const User = require("../../models/User");
const router = express.Router();

router.post("/:studentId", async (req, res) => {
  try {
    // find student and get batch
    const student = await User.findById(req.params.studentId);
    if (!student || !student.batch) {
      return res.status(404).json({ message: "Batch not found for this student" });
    }
    const timetable = await Timetable.findOne({ batch: student.batch });
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }
    res.json({ timetable });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
