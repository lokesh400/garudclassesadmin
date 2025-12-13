const express = require("express");
const User = require("../models/User.js");
const Batch = require("../models/Batch.js");
const bcrypt = require("bcryptjs");

const router = express.Router();

async function generateRollNumber(batch) {
  const yearPart = batch.year.slice(-2);
  const classPart = batch.name
  let coursePart = '';
  if (batch.courseType === 'JEE') coursePart = 'N';
  else if (batch.courseType === 'NEET') coursePart = 'M';
  else if (batch.courseType === 'Foundation') coursePart = 'F';
  else coursePart = 'X';
  const count = await User.countDocuments({ batch: batch._id});
  const seqPart = String(count + 1).padStart(3, '0');
  return `${yearPart}${classPart}${coursePart}${seqPart}`;
}

// Admin: Create student
router.post('/create', async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);
    const { name, email, batchId,parent,number } = req.body;
    if (!name || !email || !batchId || !parent)
      return res.status(400).json({ message: 'All fields are required' });
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const roll = await generateRollNumber(batch);
    const student = await User.create({
      name,
      username:email,
      batch: batchId,
      rollNumber: roll,
      parent,
      number,
      role: 'student',
      password: hashedPassword,
    });
    res.status(201).json({ message: 'Student added', student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Admin: List students
router.get("/all/:id", async (req, res) => {
  try {
    const students = await User.find({ batch: req.params.id }).populate("batch");
    res.render("batch/all-students", { students,
      title: 'All Students',
      pageTitle: 'All Students',
      activePage: 'students',
     });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching students");
  }
});



///////
router.get("/all", async (req, res) => {
  try {
    const users = await User.find().populate("batch").lean();
    res.render("students/all-students", { title: "All Students", users ,
      title: "All Students",
      pageTitle: "All Students",
      activePage: "students",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching users");
  }
});

///////////edit any student
///////////////////////////
router.post("/edit/:id", async (req, res) => {
  try {
    const { name, username, parent, rollNumber, role,number } = req.body;
    console.log(req.body);
    await User.findByIdAndUpdate(req.params.id, { name, username, parent, rollNumber, role,number });
    res.json({ success: true, message: "User updated successfully!" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Failed to update user." });
  }
});

module.exports = router;
