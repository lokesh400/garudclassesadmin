const express = require("express");
const mongoose = require("mongoose")
const Batch = require("../../../models/Batch.js");
const User = require("../../../models/User.js");
const Form = require("../../../models/Form.js");
const Marks = require("../../../models/Marks.js");
const Query = require("../../../models/Query")
const { isLoggedIn, requireRole } = require("../../../middleware/auth");
const router = express.Router();
const FollowUp = require("../../../models/FollowUp");

/**
 * GET /queries
 * Fetch all leads with last follow-up
 */
router.get("/queries", async (req, res) => {
  try {
    const queries = await Query.find()
      .populate("createdBy", "name role")
      .populate("closedBy", "name role")
      .sort({ createdAt: -1 })
      .lean();

    const queryIds = queries.map((q) => q._id);

    // 🔥 fetch last follow-up for each query
    const followups = await FollowUp.aggregate([
      { $match: { queryId: { $in: queryIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$queryId",
          lastFollowUp: { $first: "$note" },
          lastFollowUpAt: { $first: "$createdAt" },
        },
      },
    ]);

    const followupMap = {};
    followups.forEach((f) => {
      followupMap[f._id.toString()] = f;
    });

    const enrichedQueries = queries.map((q) => ({
      ...q,
      lastFollowUp: followupMap[q._id.toString()]?.lastFollowUp || null,
      lastFollowUpAt: followupMap[q._id.toString()]?.lastFollowUpAt || null,
    }));

    res.json({
      success: true,
      queries: enrichedQueries,
    });
  } catch (err) {
    console.error("FETCH QUERIES ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch queries",
    });
  }
});
///////////////////////////////////////////////
//////////////////////////////////////////////
///////////new query///////////////////////////
/////////////////////////////////////////////
/**
 * POST /queries
 * Create new enquiry
 */
router.post("/queries", async (req, res) => {
    const { studentName, mobileNumber, description } = req.body;
try{
    if (!studentName || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Student name and mobile number are required",
      });
    }

    const query = await Query.create({
      studentName,
      mobileNumber,
      description,
      createdBy: req.user._id,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      query,
    });
  } catch (err) {
    console.error("CREATE QUERY ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create enquiry",
    });
  }
});


router.get("/query/:id", async (req, res) => {
  try {
    const lead = await Query.findById(req.params.id)
      .populate("createdBy", "name role")
      .populate("closedBy", "name role");

    if (!lead) return res.status(404).json({ success: false });
    console.log(lead);

    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.get("/query/:id/followups", async (req, res) => {
  try {
    const followups = await FollowUp.find({
      queryId: req.params.id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, followups });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});


///////////////////////////////////////
///////Individual/////////////////////
//////////////////////////////////////
router.get("/queries/me", async (req, res) => {
  try {
const queries = await Query.find({ createdBy: req.user.id })
  .populate("createdBy", "name role")
  .populate("closedBy", "name role")
  .sort({ createdAt: -1 })
  .lean();
/* ---------------- NO QUERIES CASE ---------------- */
if (!queries.length) {
  return res.json({
    success: true,
    leads: [],
  });
}

/* ---------------- FETCH LAST FOLLOW-UPS ---------------- */
const queryIds = queries.map((q) => q._id);

const followups = await FollowUp.aggregate([
  {
    $match: {
      queryId: { $in: queryIds },
    },
  },
  { $sort: { createdAt: -1 } },
  {
    $group: {
      _id: "$queryId",
      lastFollowUp: { $first: "$note" },
      lastFollowUpAt: { $first: "$createdAt" },
    },
  },
]);

/* ---------------- MAP FOLLOW-UPS ---------------- */
const followupMap = {};
followups.forEach((f) => {
  followupMap[f._id.toString()] = f;
});

/* ---------------- MERGE INTO QUERIES ---------------- */
const enrichedQueries = queries.map((q) => ({
  ...q,
  lastFollowUp: followupMap[q._id.toString()]?.lastFollowUp || null,
  lastFollowUpAt: followupMap[q._id.toString()]?.lastFollowUpAt || null,
}));

res.json({
  success: true,
  leads: enrichedQueries,
});

  } catch (err) {
    console.error("FETCH QUERIES ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch queries",
    });
  }
});


/**
 * POST /api/admin/query/:id/followups
 * Add a follow-up to a lead
 */
router.post("/queries/:id/followups", async (req, res) => {
  try {
    console.log("hit");

    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note is required",
      });
    }

    // 1️⃣ Fetch lead
    const lead = await Query.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // 2️⃣ Check ownership (IMPORTANT)
    if (lead.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not Created By You",
      });
    }

    // 3️⃣ Create follow-up
    const followup = await FollowUp.create({
      queryId: req.params.id,
      note: note.trim(),
      createdAt: new Date(),
    });

    // 4️⃣ SEND RESPONSE ONCE
    return res.json({
      success: true,
      followup,
    });
  } catch (err) {
    console.error("ADD FOLLOWUP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to add follow-up",
    });
  }
});



module.exports = router;