const express = require("express");
const Batch = require("../models/Batch.js");

const router = express.Router();

// ✅ Render page for admin to create and view batches (EJS)
router.get("/", async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    res.render("batch/all-batches", { batches,
      title: 'All Batches',
      pageTitle: 'All Batches',
      activePage: 'batches',
     });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// ✅ API to create a new batch
router.post("/create", async (req, res) => {
  try {
    console.log(req.body);
    const { name, courseType, year } = req.body;
    if (!name || !courseType || !year)
      return res.status(400).json({ message: "All fields are required" });
    const batch = new Batch({ name, courseType, year });
    await batch.save();

    res.status(201).json({ message: "Batch created successfully", batch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ API to get all batches (for React Native)
router.get("/", async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


///// grt route to add student to batch (ejs form) /////
// Admin: Render add student page
// Admin: Render add student page
router.get("/add/:id", async (req, res) => {
  try {
    res.render("batch/add-student", { batchId: req.params.id,
      title: 'Add Student',
      pageTitle: 'Add Student',
      activePage: 'students',
     });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching batches");
  }
});

module.exports = router;
