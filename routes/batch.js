const express = require("express");
const Batch = require("../models/Batch.js");
const User = require("../models/User.js");
const Form = require("../models/Form.js");
const Marks = require("../models/Marks.js");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
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



/////////////////////////////////////////////
////////////////////////////////////////////
//////List Of Student Details//////////////
//////////////////////////////////////////
/////////////////////////////////////////
// 🧾 Download Excel template for a batch
router.get("/data/download/:batchId", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const batchId = req.params.batchId;
    const batch = await Batch.findById(batchId);
    const students = await User.find({ batch: batchId }).sort({ rollNumber: 1 });
    if (!batch) return res.status(404).send("Batch not found");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${batch.name} Marks`);    
    const columns =
         [
            { header: "Name", key: "name", width: 25 },
            { header: "Roll Number", key: "rollNumber", width: 15 },
            { header: "Username", key: "username", width: 15 },
            { header: "Email", key: "email", width: 15 },
            { header: "Number", key: "number", width: 15 },
            { header: "Father's Name", key: "fatherName", width: 15 },
            { header: "Mother's Name", key: "motherName", width: 15 },
            { header: "Address", key: "address", width: 15 },
          ];
    sheet.columns = columns;
    students.forEach((s) => {
      sheet.addRow({
        name: s.name,
        rollNumber: s.rollNumber,
        username: s.username,
        email:s.email,
        number:s.number,
        fatherName:s.fatherName,
        motherName:s.motherName,
        address:s.address
      });
    });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${batch.name.replace(/\s+/g, "_")}_student_details.xlsx`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating Excel template");
  }
});


module.exports = router;
