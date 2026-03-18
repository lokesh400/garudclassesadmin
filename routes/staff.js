const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");
const { uploadStaffDocs } = require("./upload");
const { isAdmin } = require("../middleware/auth");

// ➕ Add Staff
router.post(
  "/add",
  isAdmin,
  uploadStaffDocs.fields([
    { name: "aadhaar" },
    { name: "pan" },
    { name: "resume" },
    { name: "offerLetter" },
    { name: "experienceLetter" },
    { name: "photo" }
  ]),
  async (req, res) => {
    try {
      const docs = {};
      for (let key in req.files) {
        docs[key] = req.files[key][0].path;
      }

      await Staff.create({
        ...req.body,
        documents: docs
      });

      res.redirect("/admin/staff");
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// 📄 Get All Staff
router.get("/", isAdmin, async (req, res) => {
  const staff = await Staff.find().sort({ createdAt: -1 });
  res.render("staff/index", { staff });
});

// 👁 View Staff Profile
router.get("/:id", isAdmin, async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  res.render("staff/view", { staff });
});

// ✏️ Update Staff
router.post(
  "/:id/update",
  isAdmin,
  uploadStaffDocs.fields([
    { name: "aadhaar" },
    { name: "pan" },
    { name: "resume" },
    { name: "offerLetter" },
    { name: "experienceLetter" },
    { name: "photo" }
  ]),
  async (req, res) => {
    const updateData = { ...req.body };

    if (req.files) {
      updateData.documents = {};
      for (let key in req.files) {
        updateData.documents[key] = req.files[key][0].path;
      }
    }

    await Staff.findByIdAndUpdate(req.params.id, updateData);
    res.redirect(`/admin/staff/${req.params.id}`);
  }
);

// ❌ Delete Staff
router.post("/:id/delete", isAdmin, async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.redirect("/admin/staff");
});

module.exports = router;
