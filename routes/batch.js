const express = require("express");
const Batch = require("../models/Batch.js");
const User = require("../models/User.js");
const Form = require("../models/Form.js");
const Marks = require("../models/Marks.js");
const { isLoggedIn, requireRole } = require("../middleware/auth");

const router = express.Router();

// ✅ Render page for admin to create and view batches (EJS)
router.get("/", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    res.render("batch/all-batches", { batches,
      title: 'All Batches',
      pageTitle: 'All Batches',
      activePage: 'batches',
      messages:req.flash(),
     });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// ✅ API to create a new batch
router.post("/create", isLoggedIn, requireRole("superadmin"), async (req, res) => {
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
router.get("/", isLoggedIn, requireRole("superadmin"), async (req, res) => {
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
router.get("/add/:id",isLoggedIn,requireRole("admin"), async (req, res) => {
  try {
    res.render("batch/add-student", { batchId: req.params.id,
      title: 'Add Student',
      pageTitle: 'Add Student',
      activePage: 'students',
      messages:req.flash(),
     });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching batches");
  }
});


///////////////////////////
//Show Particular Batch
//////////////////////////

router.get("/:id", async (req, res) => {
  const batchId = req.params.id;
  const batch = await Batch.findById(batchId);
  const studentsCount = await User.countDocuments({ batch: batchId });
  const totalTests = await Marks.countDocuments({ batch: batchId }); // if test schema exists
  const forms = await Form.find();
  res.render("batch/particularBatch", {
    batch,
    studentsCount,
    totalTests,
    forms,
    title: 'Batch Details',
    pageTitle: 'Batch Details',
    activePage: 'batches',
    messages:req.flash(),
  });
});

router.post("/:id/delete", async (req, res) => {
  try {
    const batchId = req.params.id;

    // prevent deleting if batch doesn't exist
    const batch = await Batch.findById(batchId);
    if (!batch) {
      req.flash("error", "Batch not found");
      return res.redirect("/api/batches");
    }
    // delete only STUDENTS in that batch
    const deletedUsers = await User.deleteMany({
      batch: batchId,
      role: "student"
    });
    await Batch.findByIdAndDelete(batchId);
    req.flash("success", `Batch deleted successfully. Removed ${deletedUsers.deletedCount} students.`);
    res.redirect("/api/batches");
  } catch (err) {
    console.log(err);
    req.flash("error", "Error deleting batch.");
    res.redirect("/api/batches");
  }
});




module.exports = router;
