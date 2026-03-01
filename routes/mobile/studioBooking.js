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

router.put("/:id/reschedule",requireRole("teacher"), async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const booking = await StudioBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status === "completed") {
      return res.status(403).json({ message: "Cannot reschedule completed session" });
    }

    booking.date = new Date(date);
    booking.startTime = startTime;
    booking.endTime = endTime;
    booking.status = "rescheduled";

    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reschedule failed" });
  }
});

module.exports = router