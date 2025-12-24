const express = require("express");
const router = express.Router();
const mongoose = require("mongoose")
const Form = require("../../../models/Form");
const Submission = require('../../../models/Submission')
const { isLoggedIn, requireRole } = require("../../../middleware/auth");

/**
 * GET /api/forms
 * Receptionist + Superadmin
 * Fetch all forms (read-only)
 */
router.get(
  "/forms",
  isLoggedIn,
  requireRole("receptionist", "superadmin"),
  async (req, res) => {
    try {
        console.log("hit")
      const forms = await Form.find()
        .sort({ createdAt: -1 })
        .select("title description date time mobileNumber email fields admitCardGenerated createdAt");

      res.json({
        success: true,
        forms,
      });
    } catch (err) {
      console.error("FETCH FORMS ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch forms",
      });
    }
  }
);


/////////////////////////////////////
/////admin to view forms////////////
router.get(
  "/:id/submissions",
  isLoggedIn,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false });
      }

      const submissions = await Submission.find({
        form: req.params.id,
      })
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        submissions,
      });
    } catch (err) {
      console.error("FETCH SUBMISSIONS ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch submissions",
      });
    }
  }
);

module.exports = router;
