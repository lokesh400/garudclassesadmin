const express = require("express");
const User = require("../models/User.js");
const Batch = require("../models/Batch.js");
const Fee = require("../models/Fee.js");
const passport = require("passport");
const crypto = require("crypto");
const { sendStudentCredentials } = require("../utils/mailer.js");
const { isLoggedIn, requireRole } = require("../middleware/auth");

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
router.post('/create', isLoggedIn, requireRole("superadmin"), async (req, res) => {
  try {
     function generateStrongPassword(length = 10) {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
        "abcdefghijklmnopqrstuvwxyz" +
        "0123456789" +
        "!@#$%^&*()_+[]{}<>?";
      const randomBytes = crypto.randomBytes(length);
      let password = "";
      for (let i = 0; i < length; i++) {
        password += chars[randomBytes[i] % chars.length];
      }
      return password;
      }
      const password = generateStrongPassword(8);
    const { name,email, batchId,username,number,fatherName,motherName,address,admissionFee,tuitionFee,transportFee,otherFee } = req.body;
    if (!name || !email || !batchId)
      return res.status(400).json({ message: 'All fields are required' });
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const existingUser = await User.findOne({ username:username });
    if (existingUser)
      return res.status(400).json({ message: 'User with this username already exists' });
    const roll = await generateRollNumber(batch);
    const student = new User({
      name,
      username,
      email,
      batch: batchId,
      rollNumber: roll,
      number,
      fatherName,
      motherName,
      address,
      role: 'student',
    });
    await User.register(student, password);
    const studentUser = await User.findOne({ username: username });
    const fee = new Fee({
      student: studentUser._id,
      admissionFee: admissionFee || 0,
      tuitionFee: tuitionFee || 0,
      transportFee: transportFee || 0,
      otherFee: otherFee || 0,
    });
    await fee.save();
    res.status(201).json({ message: 'Student added', student });
    await sendStudentCredentials(email, student.username, password);
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
