const express = require("express");
const Event = require("../models/Event.js");
const Form = require("../models/Form.js");
const Submission = require("../models/Submission.js");
const { isLoggedIn, requireRole } = require("../middleware/auth");

const router = express.Router();

// 📅 GET /events : List all events
router.get("/", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    
    // Find associated forms for these events
    const forms = await Form.find({ event: { $in: events.map(e => e._id) } });
    
    // Map eventId to its Form object
    const eventFormMap = {};
    forms.forEach(f => {
      eventFormMap[f.event.toString()] = f;
    });

    res.render("events/index", {
      title: "Event Management",
      pageTitle: "Event Management",
      activePage: "events",
      events,
      eventFormMap
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to retrieve events.");
    res.redirect("back");
  }
});

// ➕ POST /events/create : Create a new event
router.post("/create", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const { name, date, description } = req.body;
    if (!name || !date) {
      req.flash("error", "Event Name and Date are required.");
      return res.redirect("/events");
    }

    const event = new Event({
      name,
      date: new Date(date),
      description
    });

    await event.save();
    req.flash("success", `Event "${name}" created successfully.`);
    res.redirect("/events");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create event.");
    res.redirect("/events");
  }
});

// ❌ POST /events/delete/:id : Delete an event
router.post("/delete/:id", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash("error", "Event not found.");
      return res.redirect("/events");
    }

    // Delete associated forms & submissions if any
    const form = await Form.findOne({ event: eventId });
    if (form) {
      await Submission.deleteMany({ form: form._id });
      await Form.findByIdAndDelete(form._id);
    }

    await Event.findByIdAndDelete(eventId);
    req.flash("success", "Event deleted successfully.");
    res.redirect("/events");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to delete event.");
    res.redirect("/events");
  }
});

// 🔄 POST /events/toggle/:id : Toggle event active state
router.post("/toggle/:id", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    event.isActive = !event.isActive;
    await event.save();
    res.json({ success: true, isActive: event.isActive });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// 📋 GET /events/submissions/:eventId : View submissions for this event's form
router.get("/submissions/:eventId", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash("error", "Event not found.");
      return res.redirect("/events");
    }

    const form = await Form.findOne({ event: eventId });
    if (!form) {
      req.flash("error", "No registration form has been created for this event yet.");
      return res.redirect("/events");
    }

    const submissions = await Submission.find({ form: form._id }).sort({ createdAt: -1 });

    res.render("events/submissions", {
      title: `${event.name} - Submissions`,
      pageTitle: `${event.name} Submissions`,
      activePage: "events",
      event,
      form,
      submissions
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load submissions.");
    res.redirect("/events");
  }
});

// 🔔 POST /events/attendance/:submissionId : Toggle attendance status for a submission
router.post("/attendance/:submissionId", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    // Set attendance explicitly or toggle
    const { attendance } = req.body;
    submission.attendance = (attendance === true || attendance === 'true');
    await submission.save();

    res.json({ success: true, attendance: submission.attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
