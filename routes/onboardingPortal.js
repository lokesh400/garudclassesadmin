const express = require("express");
const router = express.Router();
const Onboarding = require("../models/Onboarding");
const { isLoggedIn } = require("../middleware/auth");
const { uploadOnboardingDocs } = require("./upload");
const { uploadToDocsCloud } = require("../utils/docsCloudinary");

// Middleware: Ensure user is an onboarding candidate
function isOnboardingCandidate(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "onboarding") {
    return next();
  }
  if (req.isAuthenticated()) {
    return res.redirect("/admin"); // Redirect non-onboarding users away
  }
  return res.redirect("/login");
}

// Document field names for the uploader
const DOC_FIELDS = [
  { name: "photo", maxCount: 1 },
  { name: "resume", maxCount: 1 },
  { name: "aadhaar", maxCount: 1 },
  { name: "pan", maxCount: 1 },
  { name: "bankAccountPhoto", maxCount: 1 },
  { name: "experienceLetter", maxCount: 1 },
  { name: "otherDocument", maxCount: 1 }
];

// ─── GET: Candidate Portal Home ────────────────────────────────────────────────
router.get("/portal", isOnboardingCandidate, async (req, res) => {
  try {
    const candidate = await Onboarding.findOne({ linkedUser: req.user._id }).lean();
    if (!candidate) {
      req.flash("error", "No onboarding profile found for your account. Please contact admin.");
      return res.redirect("/login");
    }

    res.render("onboarding/portal", {
      candidate,
      user: req.user,
      title: "My Onboarding",
      pageTitle: "Onboarding Portal",
      layout: "layouts/admin"
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ─── POST: Upload Documents ────────────────────────────────────────────────────
router.post(
  "/portal/upload-docs",
  isOnboardingCandidate,
  uploadOnboardingDocs.fields(DOC_FIELDS),
  async (req, res) => {
    try {
      const candidate = await Onboarding.findOne({ linkedUser: req.user._id });
      if (!candidate) {
        req.flash("error", "Onboarding profile not found.");
        return res.redirect("/onboarding/portal");
      }

      // Update text fields
      const textFields = [
        "phone", "alternatePhone", "fatherName", "motherName", "address",
        "aadhaarNumber", "panNumber", "bankName", "accountHolderName",
        "accountNumber", "ifscCode"
      ];
      textFields.forEach(field => {
        if (req.body[field]) candidate[field] = req.body[field].trim();
      });

      // Upload files to Documents Cloudinary
      candidate.documents = candidate.documents || {};
      if (req.files) {
        for (const fieldName of Object.keys(req.files)) {
          const file = req.files[fieldName][0];
          const folder = `onboarding/${candidate._id}`;
          const { url } = await uploadToDocsCloud(file.buffer, folder);
          candidate.documents[fieldName] = url;
        }
      }

      await candidate.save();
      req.flash("success", "Documents and information submitted successfully!");
      res.redirect("/onboarding/portal");
    } catch (err) {
      req.flash("error", err.message);
      res.redirect("/onboarding/portal");
    }
  }
);

// ─── POST: Accept Offer Letter ─────────────────────────────────────────────────
router.post("/portal/accept-offer", isOnboardingCandidate, async (req, res) => {
  try {
    const { signature } = req.body;
    if (!signature || !signature.trim()) {
      req.flash("error", "Digital signature is required to accept the offer.");
      return res.redirect("/onboarding/portal");
    }

    const candidate = await Onboarding.findOne({ linkedUser: req.user._id });
    if (!candidate) {
      req.flash("error", "Onboarding profile not found.");
      return res.redirect("/onboarding/portal");
    }

    if (candidate.offerStatus !== "Sent") {
      req.flash("error", "No pending offer letter to sign.");
      return res.redirect("/onboarding/portal");
    }

    candidate.offerStatus = "Accepted";
    candidate.digitalSignature = signature.trim();
    candidate.offerSignedAt = new Date();
    candidate.onboardingStatus = "Offer Accepted";
    await candidate.save();

    req.flash("success", "Offer letter accepted and digitally signed! The admin will complete your onboarding shortly.");
    res.redirect("/onboarding/portal");
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/onboarding/portal");
  }
});

// ─── POST: Reject Offer Letter ─────────────────────────────────────────────────
router.post("/portal/reject-offer", isOnboardingCandidate, async (req, res) => {
  try {
    const candidate = await Onboarding.findOne({ linkedUser: req.user._id });
    if (!candidate) {
      req.flash("error", "Onboarding profile not found.");
      return res.redirect("/onboarding/portal");
    }

    if (candidate.offerStatus !== "Sent") {
      req.flash("error", "No pending offer letter to reject.");
      return res.redirect("/onboarding/portal");
    }

    candidate.offerStatus = "Rejected";
    candidate.onboardingStatus = "Pending";
    await candidate.save();

    req.flash("success", "Offer letter rejected. The admin has been notified through the dashboard.");
    res.redirect("/onboarding/portal");
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/onboarding/portal");
  }
});

module.exports = router;
