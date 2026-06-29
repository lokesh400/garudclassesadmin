const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const Batch = require("../models/Batch.js");
const User = require("../models/User.js");
const Marks = require("../models/Marks.js");
const { isLoggedIn, requireRole } = require("../middleware/auth");

const mongoose = require("mongoose");
const router = express.Router();
const upload = multer({ dest: "uploads/" });

// 🧾 Download Excel template for a batch
router.get("/download/:batchId", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const batchId = req.params.batchId;
    const batch = await Batch.findById(batchId);
    const students = await User.find({ batch: batchId }).sort({ rollNumber: 1 });
    if (!batch) return res.status(404).send("Batch not found");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${batch.name} Marks`);
    const columns =
      batch.courseType === "JEE"
        ? [
            { header: "Name", key: "name", width: 25 },
            { header: "Roll Number", key: "rollNumber", width: 15 },
            { header: "Physics Total", key: "physicsTotal", width: 15 },
            { header: "Physics", key: "physics", width: 15 },
            { header: "Chemistry Total", key: "chemistryTotal", width: 15 },
            { header: "Chemistry", key: "chemistry", width: 15 },
            { header: "Maths Total", key: "mathsTotal", width: 15 },
            { header: "Maths", key: "math", width: 15 },
          ]
        : [
            { header: "Name", key: "name", width: 25 },
            { header: "Roll Number", key: "rollNumber", width: 15 },
            { header: "Physics Total", key: "physicsTotal", width: 15 },
            { header: "Physics", key: "physics", width: 15 },
            { header: "Chemistry Total", key: "chemistryTotal", width: 15 },
            { header: "Chemistry", key: "chemistry", width: 15 },
            { header: "Botany Total", key: "botanyTotal", width: 15 },
            { header: "Botany", key: "botany", width: 15 },
            { header: "Zoology Total", key: "zoologyTotal", width: 15 },
            { header: "Zoology", key: "zoology", width: 15 },
          ];
    sheet.columns = columns;
    students.forEach((s) => {
      sheet.addRow({
        name: s.name,
        rollNumber: s.rollNumber,
      });
    });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${batch.name.replace(/\s+/g, "_")}_template.xlsx`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating Excel template");
  }
});

// 📤 Upload Excel and Save Marks
router.post("/upload/:batchId",isLoggedIn,requireRole("admin"), upload.single("excelFile"), async (req, res) => {
  try {
    const batchId = req.params.batchId;
    console.log(req.body.testTitle);
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    const type = batch.courseType;
    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    const marksData = [];
    if(type==="JEE"){
        worksheet.eachRow(async (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const [studentName, rollNumber ,physicsTotal, physics,chemistryTotal, chemistry, mathsTotal, maths] = row.values.slice(1);
      const newResult = new Marks({
      batch: batchId,
      student:studentName,
      rollNo: rollNumber,
      physicsTotal:  physicsTotal ,
      physics: physics,
      chemistryTotal: chemistryTotal,
      chemistry: chemistry,
      mathTotal: mathsTotal,
      math: maths,
      marks: marksData,
      total: physics + chemistry + maths,
      testTitle: req.body.testTitle,
      examType: type,
    });
    await newResult.save();
    });
    } else if(type==="NEET"){
        worksheet.eachRow(async (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const [studentName, rollNumber, physicsTotal, physics, chemistryTotal, chemistry, botanyTotal, botany, zoologyTotal, zoology] = row.values.slice(1);
      const newResult = new Marks({
      batch: batchId,
      student:studentName,
      rollNo: rollNumber,
      physicsTotal:  physicsTotal ,
      physics: physics,
      chemistryTotal: chemistryTotal,
      chemistry: chemistry,
      botanyTotal: botanyTotal,
      botany: botany,
      zoologyTotal: zoologyTotal,
      zoology: zoology,
      marks: marksData,
      total: physics + chemistry + botany + zoology,
      testTitle: req.body.testTitle,
      examType: type,
    });
    await newResult.save();
    });
    }
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("json"))) {
      return res.json({ message: "Marks uploaded successfully!", data: marksData });
    } else {
      req.flash("success", "Marks uploaded successfully!");
      return res.redirect(`/marks/tests/${batchId}`);
    }
  } catch (err) {
    console.error(err);
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("json"))) {
      return res.status(500).json({ message: "Error processing file", error: err.message });
    } else {
      req.flash("error", `Error processing file: ${err.message}`);
      return res.redirect("back");
    }
  }
});



// 📤 Render Upload Marks Page
router.get("/upload/:batchId", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      req.flash("error", "Batch not found");
      return res.redirect("back");
    }
    res.render("test/upload-marks", {
      batch,
      title: `Upload Marks - ${batch.name}`,
      pageTitle: `Upload Marks - ${batch.name}`,
      activePage: 'batches',
    });
  } catch (err) {
    console.error("GET UPLOAD ERROR:", err);
    req.flash("error", "Failed to load upload page.");
    res.redirect("back");
  }
});

// 📄 List all tests for a batch
router.get("/tests/:batchId", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      req.flash("error", "Batch not found");
      return res.redirect("back");
    }

    // Aggregation to compute statistics for each test dynamically
    const testsStats = await Marks.aggregate([
      { $match: { batch: new mongoose.Types.ObjectId(batch.id) } },
      {
        $addFields: {
          calculatedTotal: {
            $add: [
              { $ifNull: ["$physics", 0] },
              { $ifNull: ["$chemistry", 0] },
              { $ifNull: ["$math", 0] },
              { $ifNull: ["$botany", 0] },
              { $ifNull: ["$zoology", 0] }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$testTitle",
          examType: { $first: "$examType" },
          studentCount: { $sum: 1 },
          avgTotal: { $avg: "$calculatedTotal" },
          maxTotal: { $max: "$calculatedTotal" },
          minTotal: { $min: "$calculatedTotal" },
          uploadedAt: { $max: "$uploadedAt" }
        }
      },
      { $sort: { uploadedAt: -1 } }
    ]);

    res.render("test/test-list", { 
      batch, 
      tests: testsStats,
      title: `Tests for ${batch.name}`,
      pageTitle: `Tests for ${batch.name}`,
      activePage: 'batches',
    });
  } catch (err) {
    console.error("GET TESTS ERROR:", err);
    req.flash("error", "Failed to load test list.");
    res.redirect("back");
  }
});

// 📊 View result of a particular test
router.get("/view/:batchId/:testTitle", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      req.flash("error", "Batch not found");
      return res.redirect("back");
    }

    const marks = await Marks.find({ batch: batch._id, testTitle: req.params.testTitle }).populate("student");
    res.render("test/view-marks", { 
      batch, 
      marks, 
      testTitle: req.params.testTitle,
      title: `Marks - ${req.params.testTitle} - ${batch.name}`,
      pageTitle: `Marks - ${req.params.testTitle} - ${batch.name}`,
      activePage: 'batches',
    });
  } catch (err) {
    console.error("VIEW MARKS ERROR:", err);
    req.flash("error", "Failed to load marks.");
    res.redirect("back");
  }
});

// ❌ Delete a test and all its marks
router.post("/delete/:batchId/:testTitle", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const { batchId, testTitle } = req.params;
    const result = await Marks.deleteMany({ batch: batchId, testTitle });
    req.flash("success", `Successfully deleted test "${testTitle}" and ${result.deletedCount} marks entries.`);
    res.redirect(`/marks/tests/${batchId}`);
  } catch (err) {
    console.error("DELETE TEST ERROR:", err);
    req.flash("error", "Failed to delete test.");
    res.redirect("back");
  }
});

// 📧 Send Results via Email using Brevo
router.post("/send/results/:batchId/:testTitle", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const { batchId, testTitle } = req.params;
    const batch = await Batch.findById(batchId);
    if (!batch) {
      req.flash("error", "Batch not found");
      return res.redirect("back");
    }

    const marksList = await Marks.find({ batch: batchId, testTitle });
    if (!marksList.length) {
      req.flash("error", "No marks found for this test");
      return res.redirect("back");
    }

    // Calculate statistics
    const numericTotals = marksList.map(m => {
      return Number(m.total) || (
        (Number(m.physics) || 0) + 
        (Number(m.chemistry) || 0) + 
        (Number(m.math) || 0) + 
        (Number(m.botany) || 0) + 
        (Number(m.zoology) || 0)
      );
    });
    const validTotals = numericTotals.filter(n => !isNaN(n));
    const grandTotal = validTotals.reduce((a, b) => a + b, 0);
    const avg = validTotals.length ? (grandTotal / validTotals.length).toFixed(1) : 0;
    const max = validTotals.length ? Math.max(...validTotals) : 0;
    const min = validTotals.length ? Math.min(...validTotals) : 0;

    const stats = { highest: max, average: avg, lowest: min };

    // Get all students in the batch to get their emails
    const students = await User.find({ batch: batchId, role: "student" });
    const studentMap = {};
    students.forEach(s => {
      if (s.rollNumber) {
        studentMap[s.rollNumber.trim().toLowerCase()] = s;
      }
    });

    const { sendStudentResultsEmail } = require("../utils/mailer");

    let sentCount = 0;
    for (const m of marksList) {
      const roll = (m.rollNo || "").trim().toLowerCase();
      const studentUser = studentMap[roll];
      if (studentUser && studentUser.email) {
        const phy = Number(m.physics) || 0;
        const chem = Number(m.chemistry) || 0;
        const math = Number(m.math) || 0;
        const bot = Number(m.botany) || 0;
        const zoo = Number(m.zoology) || 0;
        const total = Number(m.total) || (phy + chem + math + bot + zoo);

        const phyTotal = Number(m.physicsTotal) || 0;
        const chemTotal = Number(m.chemistryTotal) || 0;
        const mathTotal = Number(m.mathTotal) || 0;
        const botTotal = Number(m.botanyTotal) || 0;
        const zooTotal = Number(m.zoologyTotal) || 0;
        
        const maxTotal = m.examType === 'JEE' 
          ? (phyTotal + chemTotal + mathTotal) 
          : (phyTotal + chemTotal + botTotal + zooTotal);

        const scores = {
          physics: phy, physicsTotal: phyTotal,
          chemistry: chem, chemistryTotal: chemTotal,
          math: math, mathTotal: mathTotal,
          botany: bot, botanyTotal: botTotal,
          zoology: zoo, zoologyTotal: zooTotal,
          total, maxTotal
        };

        try {
          await sendStudentResultsEmail(
            studentUser.email,
            studentUser.name || m.student,
            testTitle,
            m.examType,
            scores,
            stats
          );
          sentCount++;
        } catch (emailErr) {
          console.error(`Error sending email to ${studentUser.email}:`, emailErr);
        }
      }
    }

    req.flash("success", `Successfully emailed results to ${sentCount} students.`);
    res.redirect("back");
  } catch (error) {
    console.error("SEND RESULTS ERROR:", error);
    req.flash("error", "Failed to send results.");
    res.redirect("back");
  }
});

module.exports = router;
