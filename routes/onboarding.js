const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Onboarding = require("../models/Onboarding");
const Staff = require("../models/Staff");
const User = require("../models/User");
const { isAdmin } = require("../middleware/auth");
const { sendStaffCredentialsEmail, sendOfferLetterEmail, sendForceHireOtpEmail } = require("../utils/mailer");

// --- Helper: generate password ---
function generateStrongPassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
}

// ─── GET: List all onboarding candidates ───────────────────────────────────────
router.get("/", isAdmin, async (req, res) => {
  try {
    const candidates = await Onboarding.find().sort({ createdAt: -1 }).lean();
    res.render("onboarding/index", {
      candidates,
      title: "Onboarding",
      pageTitle: "Onboarding Pipeline",
      activePage: "onboarding"
    });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/admin");
  }
});

// ─── GET: New candidate form ────────────────────────────────────────────────────
router.get("/new", isAdmin, (req, res) => {
  res.render("onboarding/new", {
    title: "Register Candidate",
    pageTitle: "Register New Candidate",
    activePage: "onboarding"
  });
});

// ─── POST: Register new onboarding candidate ────────────────────────────────────
router.post("/add", isAdmin, async (req, res) => {
  try {
    const { name, email, department, designation, intendedRole } = req.body;
    const username = String(email || "").trim().toLowerCase();

    if (!name || !username || !department || !designation) {
      req.flash("error", "Name, email, department, and designation are required.");
      return res.redirect("/admin/onboarding/new");
    }

    const exists = await User.findOne({ username });
    if (exists) {
      req.flash("error", "A user account with this email already exists.");
      return res.redirect("/admin/onboarding/new");
    }

    const password = generateStrongPassword(10);
    const user = new User({
      name: name.trim(),
      username,
      email: username,
      role: "onboarding"
    });
    await User.register(user, password);

    const candidate = await Onboarding.create({
      name: name.trim(),
      email: username,
      department: department.trim(),
      designation: designation.trim(),
      intendedRole: intendedRole || "teacher",
      linkedUser: user._id,
      onboardingStatus: "Pending"
    });

    const loginLink = `${req.protocol}://${req.get("host")}/login`;
    await sendStaffCredentialsEmail(username, name.trim(), username, password, loginLink);

    req.flash("success", `Candidate registered! Credentials emailed to ${username}.`);
    res.redirect(`/admin/onboarding/${candidate._id}`);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/admin/onboarding/new");
  }
});

// ─── GET: View candidate profile ────────────────────────────────────────────────
router.get("/:id", isAdmin, async (req, res) => {
  try {
    const candidate = await Onboarding.findById(req.params.id).populate("linkedUser").lean();
    if (!candidate) {
      req.flash("error", "Candidate not found.");
      return res.redirect("/admin/onboarding");
    }
    res.render("onboarding/view", {
      candidate,
      title: candidate.name,
      pageTitle: "Onboarding Profile",
      activePage: "onboarding"
    });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/admin/onboarding");
  }
});

// ─── POST: Update candidate details ─────────────────────────────────────────────
router.post("/:id/update", isAdmin, async (req, res) => {
  try {
    const {
      name, phone, alternatePhone, fatherName, motherName, address,
      aadhaarNumber, panNumber, department, designation, intendedRole,
      bankName, accountHolderName, accountNumber, ifscCode
    } = req.body;

    const candidate = await Onboarding.findById(req.params.id);
    if (!candidate) {
      req.flash("error", "Candidate not found.");
      return res.redirect("/admin/onboarding");
    }

    let subjects = [];
    if (req.body.subjects) {
      subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [req.body.subjects];
    }

    Object.assign(candidate, {
      name: name?.trim() || candidate.name,
      phone: phone?.trim() || candidate.phone,
      alternatePhone: alternatePhone?.trim() || candidate.alternatePhone,
      fatherName: fatherName?.trim() || candidate.fatherName,
      motherName: motherName?.trim() || candidate.motherName,
      address: address?.trim() || candidate.address,
      aadhaarNumber: aadhaarNumber?.trim() || candidate.aadhaarNumber,
      panNumber: panNumber?.trim() || candidate.panNumber,
      department: department?.trim() || candidate.department,
      designation: designation?.trim() || candidate.designation,
      intendedRole: intendedRole || candidate.intendedRole,
      bankName: bankName?.trim() || candidate.bankName,
      accountHolderName: accountHolderName?.trim() || candidate.accountHolderName,
      accountNumber: accountNumber?.trim() || candidate.accountNumber,
      ifscCode: ifscCode?.trim() || candidate.ifscCode,
      subjects
    });

    await candidate.save();
    req.flash("success", "Candidate details updated.");
    res.redirect(`/admin/onboarding/${req.params.id}`);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect(`/admin/onboarding/${req.params.id}`);
  }
});

// ─── POST: Send Offer Letter ─────────────────────────────────────────────────────
router.post("/:id/send-offer", isAdmin, async (req, res) => {
  try {
    const { offerDesignation, offerSalary, offerJoiningDate } = req.body;
    if (!offerDesignation || !offerSalary || !offerJoiningDate) {
      req.flash("error", "Designation, salary, and joining date are required.");
      return res.redirect(`/admin/onboarding/${req.params.id}`);
    }

    const candidate = await Onboarding.findById(req.params.id);
    if (!candidate) {
      req.flash("error", "Candidate not found.");
      return res.redirect("/admin/onboarding");
    }

    candidate.offerStatus = "Sent";
    candidate.offerDesignation = offerDesignation.trim();
    candidate.offerSalary = offerSalary.trim();
    candidate.offerJoiningDate = new Date(offerJoiningDate);
    candidate.onboardingStatus = "Offer Sent";
    await candidate.save();

    // Send email — candidate logs into portal to sign
    const portalLink = `${req.protocol}://${req.get("host")}/onboarding/portal`;
    await sendOfferLetterEmail(
      candidate.email,
      candidate.name,
      candidate.offerDesignation,
      candidate.offerSalary,
      candidate.offerJoiningDate,
      portalLink
    );

    req.flash("success", `Offer letter sent to ${candidate.email}. Candidate must log in to sign.`);
    res.redirect(`/admin/onboarding/${req.params.id}`);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect(`/admin/onboarding/${req.params.id}`);
  }
});

// ─── POST: Force Onboard — Send OTP to Superadmin ───────────────────────────────
router.post("/:id/force-onboard-otp", isAdmin, async (req, res) => {
  try {
    const candidate = await Onboarding.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.forceOnboardOtp = {
      code: otpCode,
      candidateId: req.params.id,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    const superadmin = await User.findOne({ role: "superadmin" });
    const recipientEmail = superadmin
      ? (superadmin.email || superadmin.username)
      : (req.user.email || req.user.username);

    await sendForceHireOtpEmail(recipientEmail, candidate.name, otpCode);
    return res.status(200).json({ success: true, message: "OTP sent to superadmin email." });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ─── POST: Force Onboard — Verify OTP & Transfer ────────────────────────────────
router.post("/:id/force-onboard-confirm", isAdmin, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      req.flash("error", "OTP code is required.");
      return res.redirect(`/admin/onboarding/${req.params.id}`);
    }

    const sessionOtp = req.session.forceOnboardOtp;
    if (
      !sessionOtp ||
      sessionOtp.candidateId !== req.params.id ||
      sessionOtp.code !== otp.trim() ||
      sessionOtp.expiresAt < Date.now()
    ) {
      req.flash("error", "Invalid or expired OTP.");
      return res.redirect(`/admin/onboarding/${req.params.id}`);
    }
    req.session.forceOnboardOtp = null;

    const candidate = await Onboarding.findById(req.params.id).populate("linkedUser");
    if (!candidate) {
      req.flash("error", "Candidate not found.");
      return res.redirect("/admin/onboarding");
    }

    // Transfer to Staff
    const newStaff = await transferCandidateToStaff(candidate, "Force Onboarded");
    req.flash("success", `${candidate.name} force-onboarded and transferred to Staff successfully!`);
    res.redirect(`/admin/staff/${newStaff._id}`);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect(`/admin/onboarding/${req.params.id}`);
  }
});

// ─── POST: Transfer to Staff ──────────────────────────────────────────────────────
router.post("/:id/transfer", isAdmin, async (req, res) => {
  try {
    const candidate = await Onboarding.findById(req.params.id).populate("linkedUser");
    if (!candidate) {
      req.flash("error", "Candidate not found.");
      return res.redirect("/admin/onboarding");
    }

    if (candidate.offerStatus !== "Accepted") {
      req.flash("error", "Candidate must digitally accept the offer letter before transfer. Use Force Onboard OTP to bypass.");
      return res.redirect(`/admin/onboarding/${req.params.id}`);
    }

    const newStaff = await transferCandidateToStaff(candidate, "Transferred");
    req.flash("success", `${candidate.name} successfully transferred to Staff!`);
    res.redirect(`/admin/staff/${newStaff._id}`);
  } catch (err) {
    req.flash("error", err.message);
    res.redirect(`/admin/onboarding/${req.params.id}`);
  }
});

// ─── POST: Delete candidate ───────────────────────────────────────────────────────
router.post("/:id/delete", isAdmin, async (req, res) => {
  try {
    const candidate = await Onboarding.findById(req.params.id);
    if (candidate) {
      // Optionally delete linked user as well
      if (candidate.linkedUser) {
        await User.findByIdAndDelete(candidate.linkedUser);
      }
      await Onboarding.findByIdAndDelete(req.params.id);
    }
    req.flash("success", "Candidate removed from onboarding pipeline.");
    res.redirect("/admin/onboarding");
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/admin/onboarding");
  }
});

// ─── Shared: Transfer candidate → Staff ──────────────────────────────────────────
async function transferCandidateToStaff(candidate, note = "") {
  // Create Staff record with all migrated data
  const staffData = {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    mobileNumber: candidate.phone,
    fatherName: candidate.fatherName,
    motherName: candidate.motherName,
    address: candidate.address,
    aadhaarNumber: candidate.aadhaarNumber,
    panNumber: candidate.panNumber,
    department: candidate.department,
    designation: candidate.designation,
    subjects: candidate.subjects || [],
    bankName: candidate.bankName,
    accountHolderName: candidate.accountHolderName,
    accountNumber: candidate.accountNumber,
    ifscCode: candidate.ifscCode,
    joiningDate: candidate.offerJoiningDate || new Date(),
    linkedUsers: [candidate.linkedUser._id || candidate.linkedUser],
    status: "Active",
    documents: {
      photo: candidate.documents?.photo || "",
      resume: candidate.documents?.resume || "",
      aadhaar: candidate.documents?.aadhaar || "",
      pan: candidate.documents?.pan || "",
      bankAccountPhoto: candidate.documents?.bankAccountPhoto || "",
      experienceLetter: candidate.documents?.experienceLetter || "",
      otherDocument: candidate.documents?.otherDocument || ""
    },
    // Preserve offer details on staff record
    offerStatus: candidate.offerStatus,
    offerDesignation: candidate.offerDesignation,
    offerSalary: candidate.offerSalary,
    offerJoiningDate: candidate.offerJoiningDate,
    digitalSignature: candidate.digitalSignature || "",
    offerSignedAt: candidate.offerSignedAt,
    hiringStatus: "Hired"
  };

  const newStaff = await Staff.create(staffData);

  // Update the linked User's role from "onboarding" to intended role
  await User.findByIdAndUpdate(
    candidate.linkedUser._id || candidate.linkedUser,
    { role: candidate.intendedRole || "teacher", isActive: true }
  );

  // Delete the Onboarding record
  await Onboarding.findByIdAndDelete(candidate._id);

  return newStaff;
}

module.exports = router;
