const express = require("express");
const router = express.Router();
const StudioBooking = require("../../models/StudioBooking");
const { isLoggedIn, requireRole } = require("../../middleware/auth");

// CREATE BOOKING
router.post(
  "/",
  isLoggedIn,
  requireRole("teacher"),
  async (req, res) => {
    try {
      const booking = await StudioBooking.create({
        teacher: req.user._id,
        date: req.body.date,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        studioName: req.body.studioName
      });
      res.json({ success: true, booking });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.get(
  "/day/:date",
  isLoggedIn,
  async (req, res) => {
    try {
      const start = new Date(req.params.date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(req.params.date);
      end.setHours(23, 59, 59, 999);

      const bookings = await StudioBooking.find({
        date: { $gte: start, $lte: end }
      })
        .populate("teacher", "name image")
        .sort({ startTime: 1 });
      res.json({ success: true, bookings });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.put(
  "/:id/status",
  isLoggedIn,
  async (req, res) => {
    try {
      const booking = await StudioBooking.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );

      res.json({ success: true, booking });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  }
);

router.put(
  "/:id/reschedule",
  isLoggedIn,
  requireRole("admin", "superadmin"),
  async (req, res) => {
    try {
      const booking = await StudioBooking.findById(req.params.id);

      booking.rescheduledFrom = booking.date;
      booking.date = req.body.date;
      booking.startTime = req.body.startTime;
      booking.endTime = req.body.endTime;
      booking.status = "rescheduled";

      await booking.save();

      res.json({ success: true, booking });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  }
);

module.exports = router