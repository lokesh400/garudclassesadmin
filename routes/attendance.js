const express = require('express');
const asyncHandler = require('express-async-handler');
const Attendance = require('../models/Attendance.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();
router.use(protect);

// POST /api/attendance
// body: { date: 'YYYY-MM-DD', present: { studentId1: true, studentId2: false } }
router.post('/', asyncHandler(async (req, res) => {
  const { date, present } = req.body;
  if (!date || !present) {
    res.status(400); throw new Error('date and present required');
  }
  let record = await Attendance.findOne({ date });
  if (record) {
    record.present = present;
    record.takenBy = req.user._id;
    await record.save();
    return res.json(record);
  }
  record = await Attendance.create({ date, present, takenBy: req.user._id });
  res.status(201).json(record);
}));

// GET /api/attendance/:date
router.get('/:date', asyncHandler(async (req, res) => {
  const record = await Attendance.findOne({ date: req.params.date });
  if (!record) { return res.status(404).json({ message: 'Not found' }); }
  res.json(record);
}));

module.exports = router;
