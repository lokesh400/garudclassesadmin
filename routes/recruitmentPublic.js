const express = require("express");
const router = express.Router();
const Recruitment = require("../models/Recruitment");
const RecruitmentApplication = require("../models/RecruitmentApplication");
const { uploadResume } = require("./upload");
const cloudinary = require("../config/cloudinary");

const uploadResumeToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "garud/recruitments/resumes",
        resource_type: "raw",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });

router.get("/", async (req, res) => {
  const recruitments = await Recruitment.find({ status: "Open" })
    .sort({ createdAt: -1 })
    .lean();
    res.status(200).json(recruitments);
});

router.get("/:id", async (req, res) => {
  const recruitment = await Recruitment.findById(req.params.id).lean();
  if (!recruitment) {
    return res.status(404).send("Recruitment not found");
  }
res.status(200).json(recruitment);
});

router.get("/:id/apply", async (req, res) => {
  const recruitment = await Recruitment.findById(req.params.id).lean();
  if (!recruitment || recruitment.status !== "Open") {
    return res.status(404).send("Recruitment not available for applications");
  }
  res.status(200).json(recruitment);
});

router.post("/:id/apply", uploadResume.single("resume"), async (req, res) => {
  try {
    const recruitment = await Recruitment.findById(req.params.id).lean();
    if (!recruitment || recruitment.status !== "Open") {
      return res.status(404).send("Recruitment not available for applications");
    }

    if (!req.file?.buffer) {
      return res.status(400).send("Resume is required");
    }

    const cloudinaryUpload = await uploadResumeToCloudinary(req.file);

    const applicationPayload = {
      ...req.body,
      recruitment: req.params.id,
      resumeFile: cloudinaryUpload.secure_url,
    };

    const application = await RecruitmentApplication.create(applicationPayload);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: application,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already applied for this job with this email." });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/:id/success", async (req, res) => {
  const recruitment = await Recruitment.findById(req.params.id).lean();
  if (!recruitment) {
    return res.status(404).json({ success: false, message: "Recruitment not found" });
  }
  res.status(200).json({ success: true, message: "Application submitted successfully" });
});

module.exports = router;
