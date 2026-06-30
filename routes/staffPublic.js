const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");

// 📄 Public View Staff Offer Letter
router.get("/offer-letter/:id", async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).lean();
    if (!staff) {
      return res.status(404).send("Offer letter not found.");
    }
    if (staff.offerStatus === "Accepted") {
      return res.render("staff/offer-success", { staff, layout: false });
    }
    if (staff.offerStatus !== "Sent") {
      return res.status(400).send("No pending offer letter found for this profile.");
    }
    res.render("staff/offer-letter", { staff, layout: false });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// 📄 Public Submit Offer Letter Digital Signature
router.post("/offer-letter/:id/accept", async (req, res) => {
  try {
    const { signature } = req.body;
    if (!signature || !signature.trim()) {
      return res.status(400).send("Digital Signature is required to accept the offer.");
    }
    
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).send("Staff member not found.");
    }
    if (staff.offerStatus !== "Sent") {
      return res.status(400).send("Offer letter is not in a signable state.");
    }

    staff.offerStatus = "Accepted";
    staff.digitalSignature = signature.trim();
    staff.offerSignedAt = new Date();
    await staff.save();

    res.render("staff/offer-success", { staff, layout: false });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

module.exports = router;
