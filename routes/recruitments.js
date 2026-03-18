const express = require("express");
const router = express.Router();
const Recruitment = require("../models/Recruitment");
const { uploadJD } = require("./upload");
const { isAdmin } = require("../middleware/auth");

router.get("/new", isAdmin, (req, res) => {
  res.render("recruitments/new", {
    title: "Add Recruitment",
    pageTitle: "Add Recruitment",
    activePage: "recruitments",
  });
});

// ➕ Add Recruitment
router.post(
  "/add",
  isAdmin,
  uploadJD.single("jd"),
  async (req, res) => {
    try {
      await Recruitment.create({
        ...req.body,
        jdFile: req.file?.path
      });
      res.redirect("/admin/recruitments");
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// 📄 Get All Recruitments (Admin)
router.get("/", isAdmin, async (req, res) => {
  const recruitments = await Recruitment.find().sort({ createdAt: -1 });
  res.render("recruitments/index", { recruitments,
    title: "Recruitments",
    pageTitle: "Recruitments",
    activePage: "recruitments", });    
   });

// 👁 View Single Recruitment
router.get("/:id", isAdmin, async (req, res) => {
  const recruitment = await Recruitment.findById(req.params.id);
  res.render("recruitments/view", { recruitment,
    title: "Recruitment Details",
    pageTitle: "Recruitment Details",
    activePage: "recruitments",
layout: false,}); 
   });

router.get("/:id/apply", async (req, res) => {
  const recruitment = await Recruitment.findById(req.params.id).lean();
  res.render("recruitments/apply", { recruitment,
    title: "Apply for Recruitment",
    pageTitle: "Apply for Recruitment",
    activePage: "",
    layout: false,  }); 
});

// ✏️ Update Recruitment
router.post(
  "/:id/update",
  isAdmin,
  uploadJD.single("jd"),
  async (req, res) => {
    const updateData = { ...req.body };
    if (req.file) updateData.jdFile = req.file.path;

    await Recruitment.findByIdAndUpdate(req.params.id, updateData);
    res.redirect("/admin/recruitments");
  }
);

// ❌ Delete Recruitment
router.post("/:id/delete", isAdmin, async (req, res) => {
  await Recruitment.findByIdAndDelete(req.params.id);
  res.redirect("/admin/recruitments");
});

module.exports = router;
