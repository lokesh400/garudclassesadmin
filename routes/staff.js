const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");
const User = require("../models/User");
const { uploadStaffDocs } = require("./upload");
const { isAdmin } = require("../middleware/auth");
const { sendStaffCredentialsEmail, sendToggleStaffStatusOtpEmail } = require("../utils/mailer");
const crypto = require("crypto");

const staffUploadFields = [
  { name: "aadhaar" },
  { name: "pan" },
  { name: "resume" },
  { name: "offerLetter" },
  { name: "experienceLetter" },
  { name: "photo" },
  { name: "bankAccountPhoto" },
  { name: "otherDocument" },
];

const normalizePath = (filePath = "") => filePath.replace(/\\/g, "/");

const ALLOWED_STAFF_LINK_ROLES = ["admin", "superadmin", "receptionist", "teacher", "hr", "mts"];

const normalizeLinkedUsers = (linkedUsersInput) => {
  if (!linkedUsersInput) return [];
  return Array.isArray(linkedUsersInput) ? linkedUsersInput : [linkedUsersInput];
};

const validateAccountFields = ({ accountNumber = "", confirmAccountNumber = "" }) => {
  const account = String(accountNumber || "").trim();
  const confirm = String(confirmAccountNumber || "").trim();

  if ((account && !confirm) || (!account && confirm)) {
    return "Account number and confirm account number must both be filled.";
  }

  if (account && confirm && account !== confirm) {
    return "Account number and confirm account number must match.";
  }

  return null;
};

router.get("/new", isAdmin, async (req, res) => {
  const eligibleUsers = await User.find({ role: { $in: ALLOWED_STAFF_LINK_ROLES } })
    .select("name username role")
    .sort({ name: 1 })
    .lean();

  res.render("staff/new", {
    title: "Add Staff",
    pageTitle: "Add Staff",
    activePage: "staff",
    eligibleUsers,
  });
});

// Helper to generate password
function generateStrongPassword(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  const randomBytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

// ➕ Add Staff
router.post(
  "/add",
  isAdmin,
  async (req, res) => {
    try {
      const { name, email, department, role } = req.body;
      const username = String(email || "").trim().toLowerCase();

      if (!name || !username || !department || !role) {
        req.flash("error", "Name, email, department, and role are required.");
        return res.redirect("/admin/staff/new");
      }

      const exists = await User.findOne({ username });
      if (exists) {
        req.flash("error", "A user account with this email/username already exists.");
        return res.redirect("/admin/staff/new");
      }

      const password = generateStrongPassword(8);
      const user = new User({
        name: name.trim(),
        username: username,
        email: username,
        role: role
      });

      await User.register(user, password);

      const fs = require("fs");
      fs.writeFileSync("uploads/staff/temp_pwd.txt", `username: ${username}\npassword: ${password}`);

      let subjects = [];
      if (req.body.subjects) {
        subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [req.body.subjects];
      }

      const staff = await Staff.create({
        name: name.trim(),
        email: username,
        department: department,
        designation: role.toUpperCase(),
        subjects: subjects,
        linkedUsers: [user._id],
        status: "Active"
      });

      const loginLink = `${req.protocol}://${req.get("host")}/login`;
      await sendStaffCredentialsEmail(username, name.trim(), username, password, loginLink);

      req.flash("success", `Staff member registered and credential email sent to ${username}!`);
      res.redirect("/admin/staff");
    } catch (err) {
      req.flash("error", err.message);
      res.redirect("/admin/staff/new");
    }
  }
);

// 📄 Get All Staff
router.get("/", isAdmin, async (req, res) => {
  const staff = await Staff.find().sort({ createdAt: -1 }).lean();
  res.render("staff/index", {
    staff,
    title: "Staff",
    pageTitle: "Staff",
    activePage: "staff",
  });
});

// 👁 View Staff Profile
router.get("/:id", isAdmin, async (req, res) => {
  const [staff, eligibleUsers] = await Promise.all([
    Staff.findById(req.params.id).populate("linkedUsers", "name username role").lean(),
    User.find({ role: { $in: ["admin", "superadmin", "receptionist"] } })
      .select("name username role")
      .sort({ name: 1 })
      .lean(),
  ]);

  if (!staff) {
    return res.status(404).send("Staff not found");
  }

  res.render("staff/view", {
    staff,
    eligibleUsers,
    title: "Staff Profile",
    pageTitle: "Staff Profile",
    activePage: "staff",
  });
});

// ✏️ Update Staff
router.post(
  "/:id/update",
  isAdmin,
  async (req, res) => {
    try {
      const { name, employeeId, designation, department, joiningDate, salary, mobileNumber, phone, email, status } = req.body;

      const existing = await Staff.findById(req.params.id);
      if (!existing) {
        req.flash("error", "Staff not found");
        return res.redirect("/admin/staff");
      }

      let subjects = [];
      if (req.body.subjects) {
        subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [req.body.subjects];
      }

      existing.name = name ? name.trim() : existing.name;
      existing.employeeId = employeeId || existing.employeeId;
      existing.designation = designation || existing.designation;
      existing.department = department || existing.department;
      existing.joiningDate = joiningDate || null;
      existing.salary = salary ? Number(salary) : null;
      existing.mobileNumber = mobileNumber || existing.mobileNumber;
      existing.phone = phone || existing.phone;
      existing.email = email || existing.email;
      existing.status = status || existing.status;
      existing.subjects = subjects;

      await existing.save();
      req.flash("success", "Staff profile updated successfully!");
      res.redirect(`/admin/staff/${req.params.id}`);
    } catch (err) {
      req.flash("error", err.message);
      res.redirect(`/admin/staff/${req.params.id}`);
    }
  }
);

// 🔁 Request Toggle Active/Inactive OTP
router.post("/:id/toggle-status-request", isAdmin, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    const adminEmail = req.user.email;
    if (!adminEmail) {
      return res.status(400).json({ success: false, message: "No active email registered for your administrator account. Please configure an email address." });
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newStatus = staff.status === "Active" ? "Inactive" : "Active";

    // Store details in session
    req.session.staffStatusToggleOtp = {
      staffId: staff._id.toString(),
      newStatus: newStatus,
      otp: code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
    };

    // Send email with OTP to current logged-in user
    await sendToggleStaffStatusOtpEmail(adminEmail, staff.name, newStatus, code);

    res.json({ success: true, message: `OTP sent to your administrator email (${adminEmail}).` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// 🔁 Confirm Toggle Active/Inactive
router.post("/:id/toggle-status-confirm", isAdmin, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required." });
    }

    const sessionOtp = req.session.staffStatusToggleOtp;
    if (!sessionOtp) {
      return res.status(400).json({ success: false, message: "No active status change request found. Please request OTP again." });
    }

    if (sessionOtp.staffId !== req.params.id) {
      return res.status(400).json({ success: false, message: "Inconsistent staff ID. Please request OTP again." });
    }

    if (sessionOtp.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Invalid OTP. Please check and try again." });
    }

    if (Date.now() > sessionOtp.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    const originalStatus = staff.status;
    const newStatus = sessionOtp.newStatus;

    staff.status = newStatus;
    
    // Add status history entry
    staff.statusHistory = staff.statusHistory || [];
    staff.statusHistory.push({
      status: newStatus,
      updatedBy: req.user.email || req.user.username || 'Admin',
      updatedAt: new Date()
    });

    await staff.save();

    // Propagate status change to associated User accounts
    const isUserActive = staff.status === "Active";
    if (staff.linkedUsers && staff.linkedUsers.length) {
      await User.updateMany({ _id: { $in: staff.linkedUsers } }, { $set: { isActive: isUserActive } });
    }

    // Clear session OTP
    req.session.staffStatusToggleOtp = null;

    res.json({ success: true, message: `Staff status successfully changed to ${newStatus}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// 🌐 Link External Portal Account
router.post("/:id/portal-accounts", isAdmin, async (req, res) => {
  try {
    const { portalName, username } = req.body;
    if (!portalName || !username) {
      req.flash("error", "Portal name and username are required.");
      return res.redirect(`/admin/staff/${req.params.id}`);
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      req.flash("error", "Staff member not found.");
      return res.redirect("/admin/staff");
    }

    staff.portalAccounts = staff.portalAccounts || [];
    staff.portalAccounts.push({ portalName, username });
    await staff.save();

    req.flash("success", `Successfully linked account for ${portalName}!`);
    res.redirect(`/admin/staff/${req.params.id}`);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect(`/admin/staff/${req.params.id}`);
  }
});

// 👤 Assign User Account to Staff Member
router.post("/:id/assign-user", isAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      req.flash("error", "Please select a user to assign.");
      return res.redirect(`/admin/staff/${req.params.id}`);
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      req.flash("error", "Staff member not found.");
      return res.redirect("/admin/staff");
    }

    // Check if user is already assigned
    if (staff.linkedUsers.includes(userId)) {
      req.flash("error", "This user account is already assigned to this staff member.");
      return res.redirect(`/admin/staff/${req.params.id}`);
    }

    staff.linkedUsers.push(userId);
    await staff.save();

    req.flash("success", "Successfully assigned user to staff member!");
    res.redirect(`/admin/staff/${req.params.id}`);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect(`/admin/staff/${req.params.id}`);
  }
});

// ❌ Delete Staff
router.post("/:id/delete", isAdmin, async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.redirect("/admin/staff");
});

module.exports = router;
