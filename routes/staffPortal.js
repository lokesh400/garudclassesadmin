const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");
const { uploadStaffDocs } = require("./upload");
const { isLoggedIn } = require("../middleware/auth");

// Helper to normalize path slashes
const normalizePath = (p) => (p ? p.replace(/\\/g, "/") : "");

// 👁 Get Staff Document Submission Page
router.get("/documents", isLoggedIn, async (req, res) => {
  try {
    const staff = await Staff.findOne({ linkedUsers: req.user._id }).lean();
    if (!staff) {
      req.flash("error", "No associated staff profile found for this login account.");
      return res.redirect("/login");
    }

    res.render("staff/portal-documents", {
      staff,
      title: "Submit Documents",
      pageTitle: "Submit Verification Documents",
      activePage: "staff-documents",
      layout: "layouts/admin" // Reuse the dashboard layout frame but tailor user actions
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 📁 Submit Documents POST
router.post(
  "/documents/upload",
  isLoggedIn,
  uploadStaffDocs.fields([
    { name: "aadhaar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "resume", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const staff = await Staff.findOne({ linkedUsers: req.user._id });
      if (!staff) {
        req.flash("error", "No associated staff profile found.");
        return res.redirect("/login");
      }

      // Update text fields
      const {
        aadhaarNumber,
        panNumber,
        bankName,
        accountHolderName,
        accountNumber,
        ifscCode
      } = req.body;

      if (aadhaarNumber) staff.aadhaarNumber = aadhaarNumber;
      if (panNumber) staff.panNumber = panNumber;
      if (bankName) staff.bankName = bankName;
      if (accountHolderName) staff.accountHolderName = accountHolderName;
      if (accountNumber) staff.accountNumber = accountNumber;
      if (ifscCode) staff.ifscCode = ifscCode;

      // Update document photo paths
      staff.documents = staff.documents || {};
      if (req.files) {
        if (req.files.aadhaar && req.files.aadhaar[0]) {
          staff.documents.aadhaar = normalizePath(req.files.aadhaar[0].path);
        }
        if (req.files.pan && req.files.pan[0]) {
          staff.documents.pan = normalizePath(req.files.pan[0].path);
        }
        if (req.files.resume && req.files.resume[0]) {
          staff.documents.resume = normalizePath(req.files.resume[0].path);
        }
      }

      await staff.save();

      req.flash("success", "Documents and information submitted successfully!");
      res.redirect("/staff/documents");
    } catch (err) {
      req.flash("error", err.message);
      res.redirect("/staff/documents");
    }
  }
);

module.exports = router;
