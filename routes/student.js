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
  const yearPart = batch.year[2].toString() + batch.year[3].toString();
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
  console.log(req.body);
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
    const { name,email, batchId,number,fatherName,motherName,address,admissionFee,tuitionFee,transportFee,otherFee } = req.body;
    if (!name || !email || !batchId)
      return res.status(400).json({ message: 'All fields are required' });
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    const roll = await generateRollNumber(batch);
    const username = roll;
    const existingUser = await User.findOne({ username:username });
    if (existingUser)
    return res.status(400).json({ message: 'User with this username already exists' });
    const student = new User({
      name,
      username:roll,
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
    const students = await User.find({ batch: req.params.id }).populate("batch").lean();
    res.render("batch/all-students", { users:students,
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
    const users = await User.find({role:"student"}).populate("batch").lean();
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
    const { name,email,number,fatherName,motherName,address,editAllowed } = req.body;
    await User.findByIdAndUpdate(req.params.id, {  name,email,number,fatherName,motherName,address,editAllowed });
    res.json({ success: true, message: "User updated successfully!" });
    console.log(req.body)
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Failed to update user." });
  }
});

//////////////////////////////////////
/////////////////////////////////////
/////Bulk Student Detals/////////////
/////////////////////////////////////

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.get('/send/details/:BatchId',isLoggedIn,requireRole('superadmin', 'admin'),async (req, res) => {
    try {
      const results = await User.find({
        batch: req.params.BatchId
      }).populate('batch');
      console.log('Results to send:', results.length)
      if (!results.length) {
        return res.status(404).json({
          message: 'No submissions found for this form'
        })
      }
      // ✅ Respond immediately
      res.json({
        message: 'Notifications are being sent in background'
      })

      // 🔥 BACKGROUND TASK
      setImmediate(async () => {
        for (const result of results) {
          try {
            if (!result) continue
            /* ---------- EMAIL ---------- */
            if (result.email) {
              password = "Please Reset Your Password";
              await sendStudentCredentials(
                result.email,
                result.username,
                password
              )
              console.log(`📧 Email sent to ${result.email}`)
              await delay(20000)
            } else {
              console.log('⚠️ WhatsApp client not ready or number missing')
            }
          } catch (singleErr) {
            console.error(
              `❌ Failed for submission ${result._id}:`,
              singleErr.message
            )
          }
        }
        console.log('📨 Student credentials notifications completed')
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({
        message: 'Error starting background job',
        error: err.message
      })
    }
  }
)



module.exports = router;
