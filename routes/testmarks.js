const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const Batch = require("../models/Batch.js");
const User = require("../models/User.js");
const Marks = require("../models/Marks.js");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// 🧾 Download Excel template for a batch
router.get("/download/:batchId", async (req, res) => {
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
router.post("/upload/:batchId", upload.single("excelFile"), async (req, res) => {
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
      const [studentName, rollNumber ,physics, chemistry, botany, zoology,physicsTotal,chemistryTotal,botanyTotal,zoologyTotal] = row.values.slice(1);
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
    res.json({ message: "Marks uploaded successfully!", data: marksData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error processing file", error: err.message });
  }
});



// 📄 List all tests for a batch
router.get("/tests/:batchId", async (req, res) => {
  const batch = await Batch.findById(req.params.batchId);
  const tests = await Marks.find({ batch: batch._id }).distinct("testTitle");
  res.render("test/test-list", { batch, tests,
    title: `Tests for ${batch.name}`,
    pageTitle: `Tests for ${batch.name}`,
    activePage: 'batches',
   });
});


// 📊 View result of a particular test
router.get("/view/:batchId/:testTitle", async (req, res) => {
  const batch = await Batch.findById(req.params.batchId);
  const marks = await Marks.find({ batch: batch._id, testTitle: req.params.testTitle }).populate("student");
  res.render("test/view-marks", { batch, marks, testTitle: req.params.testTitle,
    title: `Marks - ${req.params.testTitle} - ${batch.name}`,
    pageTitle: `Marks - ${req.params.testTitle} - ${batch.name}`,
    activePage: 'batches',
   });
});

module.exports = router;
