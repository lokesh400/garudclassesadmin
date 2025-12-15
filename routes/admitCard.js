const express = require("express");
const Submission = require("../models/Submission.js"); // submissions
const Form = require("../models/Form.js"); // form metadata
const path = require("path");
const { isLoggedIn, requireRole } = require("../middleware/auth");
const { sendAdmitCardUpdate } = require("../utils/mailer.js");

const router = express.Router();

// GET: Admit card search page
router.get("/", (req, res) => {
  res.render("admitCardSearch", { submissions: [], query: {}, layout: false });
});

const Marks = require("../models/Marks");
const User = require("../models/User");
const {
  client,
  initSocket,
  waStatus,
} = require("../whatsapp/whatsappClient");

router.get("/generate/:formId", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  console.log("Admit card generation requested for form:", req.params.formId);
  try {
    const { formId } = req.params;
    const result = await Submission.updateMany(
      { form: formId },
      { $set: { admitCardGenerated: true } }
    );
    const result2 = await Form.findByIdAndUpdate(formId, {
      admitCardGenerated: true
    });
    await Submission.find({ form: formId, admitCardGenerated: true });
    res.json({
      success: true,
      message: `Admit card status updated for ${result.modifiedCount} submissions.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.post(
  "/send/update/:formId",
  isLoggedIn,
  requireRole("superadmin", "admin"),
  async (req, res) => {
    try {
      const results = await Submission
        .find({ form: req.params.formId })
        .populate("form");

      console.log("Results to send:", results.length);

      if (!results.length) {
        return res.status(404).json({
          message: "No submissions found for this form"
        });
      }

      // ✅ Respond immediately
      res.json({
        message: "Notifications are being sent in background"
      });

      // 🔥 BACKGROUND TASK
      setImmediate(async () => {
        for (const result of results) {
          try {
            if (!result) continue;

            /* ---------- EMAIL ---------- */
            if (result.email) {
              const emailMessage = `Dear Student,

Your Admit Card for the exam "${result.form.title}" has been generated.

Download link:
https://garudclasses.com/admitcard/download/${result._id}

Thank you.`;

              await sendAdmitCardUpdate(result.email, emailMessage);
            }

            /* ---------- WHATSAPP ---------- */
            if (client?.info?.wid && result.mobileNumber) {
              const chatId = `91${result.mobileNumber}@c.us`;
              const waMessage = `Hello Student,

Your admit card has been generated.

Download here:
https://garudclasses.com/admitcard/download/${result._id}`;

              await client.sendMessage(chatId, waMessage);

              console.log("✅ WhatsApp sent to", chatId);

              // ⏱️ Delay AFTER WhatsApp only
              await delay(20000);
            } else {
              console.log("⚠️ WhatsApp client not ready or number missing");
            }

          } catch (singleErr) {
            console.error(
              `❌ Failed for submission ${result._id}:`,
              singleErr.message
            );
          }
        }

        console.log("📨 Admit card notifications completed");
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Error starting background job",
        error: err.message
      });
    }
  }
);


router.get("/search", (req, res) => {
  res.render("students/student-search.ejs", { layout: false }); // simple search form
});

router.get("/search/results", async (req, res) => {
  try {
    const { name, mobile } = req.query;
    if (!name && !mobile) return res.render("student-search-results", { submissions: [] });
    const submissions = await Submission.find({mobileNumber:mobile,admitCardGenerated:true})
      .populate("form", "title date")
      .sort({ createdAt: -1 });
    res.render("students/student-search-results", { submissions , layout: false });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching submissions.");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate("form");
    if (!submission) return res.status(404).send("Submission not found");
    if (!submission.admitCardGenerated) return res.status(400).send("Admit card not generated");

    res.render("students/download-admit-card", {
      submission,
      examCenter: "Garud Classes Near Saraswati Mahila College NH-19 Adarsh Nagar Colony Palwal Haryana 121102",
      layout: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// // GET: Download admit card
// router.get("/download/:submissionId", async (req, res) => {
//   try {
//     const submission = await Submission.findById(req.params.submissionId).populate("form");
//     if (!submission || !submission.admitCardGenerated) {
//       return res.status(404).send("Admit card not found");
//     }
//     const filePath = path.join(process.cwd(), "admitCards", `${submission._id}.pdf`);
//     res.download(filePath);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Server error");
//   }
// });

module.exports = router;
