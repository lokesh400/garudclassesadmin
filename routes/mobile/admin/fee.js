const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../../../models/User");
const Fee = require("../../../models/Fee");
const Batch = require("../../../models/Batch");
const { isLoggedIn, requireRole } = require("../../../middleware/auth");

/**
 * GET /api/admin/students/fees
 *
 * Query Params:
 *  - batchId (optional)
 *  - search (optional)
 *
 * Example:
 *  /api/admin/students/fees?batchId=64fa...&search=aman
 */
router.get(
  "/students/fees",
  isLoggedIn,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const { batchId, search } = req.query;

      const userMatch = {
        role: "student",
      };

      // 🔍 Search by student name
      if (search) {
        userMatch.name = { $regex: search, $options: "i" };
      }

      // 🎓 Filter by batch
      if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
        userMatch.batch = new mongoose.Types.ObjectId(batchId);
      }

      const students = await User.aggregate([
        { $match: userMatch },

        // join batch
        {
          $lookup: {
            from: "batches",
            localField: "batch",
            foreignField: "_id",
            as: "batch",
          },
        },
        { $unwind: { path: "$batch", preserveNullAndEmptyArrays: true } },

        // join fees
        {
          $lookup: {
            from: "fees",
            localField: "_id",
            foreignField: "student",
            as: "fee",
          },
        },
        { $unwind: { path: "$fee", preserveNullAndEmptyArrays: true } },

        {
          $project: {
            _id: 1,
            name: 1,
            rollNumber: 1,
            number: 1,
            batchName: "$batch.name",

            totalFee: { $ifNull: ["$fee.totalFee", 0] },
            totalPaid: { $ifNull: ["$fee.totalPaid", 0] },
            balance: { $ifNull: ["$fee.balance", 0] },
          },
        },

        { $sort: { name: 1 } },
      ]);

      res.json({
        success: true,
        count: students.length,
        students,
      });
    } catch (err) {
      console.error("FETCH STUDENT FEES ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch student fees",
      });
    }
  }
);

// GET detailed fee of one student
router.get(
  "/student/:id/fee",
  isLoggedIn,
  requireRole("superadmin"),
  async (req, res) => {
    const fee = await Fee.findOne({
      student: req.params.id,
    }).lean();
    res.json({
      success: true,
      fee,
    });
  }
);


module.exports = router;
