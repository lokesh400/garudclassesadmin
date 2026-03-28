const express = require("express");
const router = express.Router();
const axios = require("axios");
const Recruitment = require("../models/Recruitment");
const RecruitmentApplication = require("../models/RecruitmentApplication");
const { uploadJD } = require("./upload");
const { isAdmin } = require("../middleware/auth");

const normalizePath = (filePath = "") => filePath.replace(/\\/g, "/");

const buildRecruitmentPayload = (body) => {
  const payload = { ...body };
  payload.openings = Number(body.openings || 1);
  payload.lastDateToApply = body.lastDateToApply ? new Date(body.lastDateToApply) : null;
  return payload;
};

router.get("/", isAdmin, async (req, res) => {
  const recruitments = await Recruitment.find().sort({ createdAt: -1 }).lean();
  const recruitmentIds = recruitments.map((item) => item._id);
  const applicationCounts = await RecruitmentApplication.aggregate([
    { $match: { recruitment: { $in: recruitmentIds } } },
    { $group: { _id: "$recruitment", count: { $sum: 1 } } },
  ]);
  const countMap = applicationCounts.reduce((acc, row) => {
    acc[String(row._id)] = row.count;
    return acc;
  }, {});

  const data = recruitments.map((item) => ({
    ...item,
    applicationCount: countMap[String(item._id)] || 0,
  }));

  res.render("recruitments/index", {
    recruitments: data,
    title: "Recruitments",
    pageTitle: "Recruitments",
    activePage: "recruitments",
  });
});

router.get("/new", isAdmin, (req, res) => {
  res.render("recruitments/new", {
    title: "Create Recruitment",
    pageTitle: "Create Recruitment",
    activePage: "recruitments",
  });
});

router.post("/add", isAdmin, uploadJD.single("jd"), async (req, res) => {
  try {
    await Recruitment.create({
      ...buildRecruitmentPayload(req.body),
      jdFile: req.file?.path ? normalizePath(req.file.path) : "",
    });
    res.redirect("/admin/recruitments");
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.get("/:id/edit", isAdmin, async (req, res) => {
  const recruitment = await Recruitment.findById(req.params.id).lean();
  if (!recruitment) {
    return res.status(404).send("Recruitment not found");
  }

  res.render("recruitments/edit", {
    recruitment,
    title: "Edit Recruitment",
    pageTitle: "Edit Recruitment",
    activePage: "recruitments",
  });
});

router.post("/:id/update", isAdmin, uploadJD.single("jd"), async (req, res) => {
  const updateData = buildRecruitmentPayload(req.body);
  if (req.file?.path) {
    updateData.jdFile = normalizePath(req.file.path);
  }

  await Recruitment.findByIdAndUpdate(req.params.id, updateData, {
    runValidators: true,
  });
  res.redirect(`/admin/recruitments/${req.params.id}`);
});

router.get("/:id", isAdmin, async (req, res) => {
  const recruitment = await Recruitment.findById(req.params.id).lean();
  if (!recruitment) {
    return res.status(404).send("Recruitment not found");
  }

  const allowedStatuses = ["New", "In Review", "Shortlisted", "Rejected", "Hired"];
  const status = req.query.status && allowedStatuses.includes(req.query.status) ? req.query.status : "All";
  const sort = req.query.sort === "oldest" ? "oldest" : "newest";

  const filter = { recruitment: req.params.id };
  if (status !== "All") {
    filter.status = status;
  }

  const applications = await RecruitmentApplication.find(filter)
    .sort({ createdAt: sort === "newest" ? -1 : 1 })
    .lean();

  const rawStatusCounts = await RecruitmentApplication.aggregate([
    { $match: { recruitment: recruitment._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const statusCounts = allowedStatuses.reduce((acc, curr) => {
    acc[curr] = 0;
    return acc;
  }, {});
  rawStatusCounts.forEach((item) => {
    statusCounts[item._id] = item.count;
  });
  statusCounts.All = Object.values(statusCounts).reduce((sum, c) => sum + c, 0);

  res.render("recruitments/view", {
    recruitment,
    applications,
    filters: {
      status,
      sort,
    },
    statusCounts,
    title: "Recruitment Details",
    pageTitle: "Recruitment Details",
    activePage: "recruitments",
  });
});

router.get("/:id/applications/:applicationId/resume", isAdmin, async (req, res) => {
  const application = await RecruitmentApplication.findOne({
    _id: req.params.applicationId,
    recruitment: req.params.id,
  }).lean();

  if (!application || !application.resumeFile) {
    return res.status(404).send("Resume not found");
  }

  const resumeUrl = application.resumeFile.startsWith("http")
    ? application.resumeFile
    : `${req.protocol}://${req.get("host")}/${application.resumeFile.replace(/^\/+/, "")}`;

  res.render("recruitments/resume-view", {
    resumeUrl,
    inlineResumeUrl: `/admin/recruitments/${req.params.id}/applications/${req.params.applicationId}/resume/inline`,
    candidateName: application.fullName || "Candidate",
    layout: false,
  });
});

router.get("/:id/applications/:applicationId/resume/inline", isAdmin, async (req, res) => {
  try {
    const application = await RecruitmentApplication.findOne({
      _id: req.params.applicationId,
      recruitment: req.params.id,
    }).lean();

    if (!application || !application.resumeFile) {
      return res.status(404).send("Resume not found");
    }

    const resumeUrl = application.resumeFile.startsWith("http")
      ? application.resumeFile
      : `${req.protocol}://${req.get("host")}/${application.resumeFile.replace(/^\/+/, "")}`;

    const response = await axios.get(resumeUrl, {
      responseType: "arraybuffer",
      timeout: 20000,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=resume.pdf");
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.send(Buffer.from(response.data));
  } catch (error) {
    return res.status(502).send("Unable to load resume preview");
  }
});

router.post("/:id/delete", isAdmin, async (req, res) => {
  await RecruitmentApplication.deleteMany({ recruitment: req.params.id });
  await Recruitment.findByIdAndDelete(req.params.id);
  res.redirect("/admin/recruitments");
});

router.post("/:id/applications/:applicationId/status", isAdmin, async (req, res) => {
  const { status, adminNotes } = req.body;
  await RecruitmentApplication.findOneAndUpdate(
    {
      _id: req.params.applicationId,
      recruitment: req.params.id,
    },
    {
      status,
      adminNotes: adminNotes || "",
    },
    { runValidators: true }
  );
  const returnTo = req.body.returnTo || `/admin/recruitments/${req.params.id}`;
  res.redirect(returnTo);
});

module.exports = router;
