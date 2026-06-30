const express = require("express");
const User = require("../models/User.js");
const Batch = require("../models/Batch.js");
const Fee = require("../models/Fee.js");
const passport = require("passport");
const crypto = require("crypto");
const { sendStudentCredentials, sendDeleteOtpEmail } = require("../utils/mailer.js");
const { isLoggedIn, requireRole } = require("../middleware/auth");

const router = express.Router();

async function generateRollNumber(batch) {
  const yearPart = batch.year[2].toString() + batch.year[3].toString();
  const classPart = batch.name;
  let coursePart = '';
  const cType = (batch.courseType || '').toUpperCase();
  if (cType === 'JEE') coursePart = 'N';
  else if (cType === 'NEET') coursePart = 'M';
  else if (cType === 'FOUNDATION') coursePart = 'F';
  else if (cType === 'NDA') coursePart = 'A';
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

    // Prevent duplicate student registration by checking Name, Number, and Email
    if (name && email && number) {
      const duplicateStudent = await User.findOne({
        name: { $regex: new RegExp("^" + name.trim() + "$", "i") },
        number: number,
        email: { $regex: new RegExp("^" + email.trim() + "$", "i") }
      });
      if (duplicateStudent) {
        return res.status(400).json({ message: "A student with the same Name, Mobile Number, and Email already exists in the system." });
      }
    }

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

  } catch (err) {
    console.error(err);
    console.log(err)
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
    const { name,email,number,fatherName,motherName,address,editAllowed,isActive } = req.body;
    await User.findByIdAndUpdate(req.params.id, {  name,email,number,fatherName,motherName,address,editAllowed,isActive });
    res.json({ success: true, message: "User updated successfully!" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Failed to update user." });
  }
});

// Admin: View student documents
router.get("/documents/:id", isLoggedIn, requireRole("superadmin", "admin", "receptionist"), async (req, res) => {
  try {
    const student = await User.findById(req.params.id).populate("batch").lean();
    if (!student) {
      return res.status(404).send("Student not found");
    }
    res.render("students/view-documents", {
      title: `${student.name}'s Documents`,
      pageTitle: `Documents - ${student.name}`,
      activePage: "students",
      student,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching student documents");
  }
});

// Admin: Toggle specific document re-upload permission
router.post("/documents/:id/toggle-reupload", isLoggedIn, requireRole("superadmin", "admin"), async (req, res) => {
  try {
    const { type } = req.body; // e.g. "studentPhoto", "class10Marksheet", etc.
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    const fieldName = `allow${type.charAt(0).toUpperCase() + type.slice(1)}Reupload`;
    student[fieldName] = !student[fieldName];
    await student.save();
    res.json({
      success: true,
      isAllowed: student[fieldName],
      message: "Permission updated successfully!"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
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
            if (result.email && result.isActive == true ) {
              password = "Please Reset Your Password";
              await sendStudentCredentials(
                result.email,
                result.username,
                password
              )
              console.log(`📧 Email sent to ${result.email}`)
              await delay(20000)
            } else {
              console.log('⚠️ Email client not ready or number missing')
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



// Route to request student deletion (generates and emails OTP to the admin)
router.post('/delete-request', isLoggedIn, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const adminEmail = req.user.email;
    if (!adminEmail) {
      return res.status(400).json({ success: false, message: 'No active email registered for your administrator account. Please configure an email address.' });
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store details in session
    req.session.deleteStudentOtp = {
      studentId: studentId,
      otp: code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
    };

    // Send email with OTP to current logged-in user
    await sendDeleteOtpEmail(adminEmail, student.name, code);

    res.json({ success: true, message: `OTP sent to your administrator email (${adminEmail}).` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
});

// Route to verify OTP and confirm student deletion
router.post('/delete-confirm', isLoggedIn, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { studentId, otp } = req.body;
    if (!studentId || !otp) {
      return res.status(400).json({ success: false, message: 'Student ID and OTP are required.' });
    }

    const sessionOtp = req.session.deleteStudentOtp;
    if (!sessionOtp) {
      return res.status(400).json({ success: false, message: 'No active deletion request found. Please request OTP again.' });
    }

    if (sessionOtp.studentId !== studentId) {
      return res.status(400).json({ success: false, message: 'Inconsistent student ID. Please request OTP again.' });
    }

    if (sessionOtp.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
    }

    if (Date.now() > sessionOtp.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    // Perform permanent deletion
    await User.findByIdAndDelete(studentId);
    await Fee.deleteMany({ student: studentId });

    // Clear session OTP
    req.session.deleteStudentOtp = null;

    res.json({ success: true, message: 'Student has been permanently deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
});

module.exports = router;
