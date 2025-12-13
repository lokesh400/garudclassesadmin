const express = require("express");
const Timetable = require("../models/Timetable.js");
const Batch = require("../models/Batch.js");
const router = express.Router();

// Admin: Render timetable form for a batch
router.get("/:batchId", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    const existing = await Timetable.findOne({ batch: batch._id });
    res.render("admin-timetable", {
      title: "Timetable Management",
      batchId: batch._id,
      batchName: batch?.name || "Batch",
      timetable: existing ? JSON.stringify(existing.timetable) : null,
      hasTimetable: !!existing,
      pageTitle: "Timetable Management",
      activePage: "timetables",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching batch or timetable");
  }
});

// ✅ Create / Update Timetable (from frontend)
router.post("/create", async (req, res) => {
  try {
    console.log("Route Hitted");
    const { batchId, timetable } = req.body;
    let existing = await Timetable.findOne({ batch: batchId });
    if (existing) {
      existing.timetable = timetable;
      await existing.save();
      return res.json({ success: true, message: "✅ Timetable updated successfully!" });
    }
    const newTimetable = new Timetable({ batch: batchId, timetable });
    await newTimetable.save();
    res.json({ success: true, message: "✅ Timetable created successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error saving timetable" });
  }
})

// Student: Fetch timetable JSON
router.get("/student/:batchId", async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ batch: req.params.batchId });
    if (!timetable) return res.status(404).json({ success: false, message: "Timetable not found" });
    res.json({ success: true, timetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching timetable" });
  }
});

// Admin: View timetable in EJS
router.get("/admin/:batchId", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    const timetable = await Timetable.find({ batch: batch._id }).sort("day");
    res.render("admin-timetable", { batch, timetable });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching timetable");
  }
});

// Student: Fetch timetable JSON
router.get("/student/:batchId", async (req, res) => {
  try {
    const timetable = await Timetable.find({ batch: req.params.batchId });
    res.json({ success: true, timetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching timetable" });
  }
});

///////Stuudent Routes /////////////
// Student timetable view (read-only)
router.get("/view/:batchId", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    const timetable = await Timetable.findOne({ batch: batch._id });
    if (!timetable) {
      return res.render("student-timetable", {
        title: "Timetable",
        batchName: batch?.name || "Batch",
        timetable: null,
      });
    }
    res.render("student-timetable", {
      title: "Timetable",
      batchName: batch?.name || "Batch",
      timetable: timetable.timetable,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading timetable");
  }
});

module.exports = router;
