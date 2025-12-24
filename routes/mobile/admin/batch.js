const express = require("express");
const mongoose = require("mongoose")
const Batch = require("../../../models/Batch.js");
const User = require("../../../models/User.js");
const Form = require("../../../models/Form.js");
const Marks = require("../../../models/Marks.js");
const { isLoggedIn, requireRole } = require("../../../middleware/auth");

const router = express.Router();

// ✅ Render page for admin to create and view batches (EJS)
router.get("/", isLoggedIn, requireRole("admin"), async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    res.json(batches);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.get("/users/batch/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;

    const users = await User.find({ batch: batchId })
      .select("-hash -salt") // passport-local-mongoose safety
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("FETCH BATCH USERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

/////////////////////////////
/**
 * GET /users/:id
 * Fetch single user (student) details
 */
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("batch", "name courseType year")
      .select("-hash -salt");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("FETCH USER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

//////////////////////////////
/**
 * GET /marks/batch/:batchId/tests
 * Fetch all tests of a batch (unique test titles)
 */
router.get("/test/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;

    const tests = await Marks.aggregate([
      {
        $match: {
          batch: new mongoose.Types.ObjectId(batchId),
        },
      },
      {
        $group: {
          _id: {
            testTitle: "$testTitle",
            examType: "$examType",
          },
          uploadedAt: { $first: "$uploadedAt" },
          totalStudents: { $sum: 1 },
        },
      },
      {
        $sort: { uploadedAt: -1 },
      },
    ]);

    res.json({
      success: true,
      count: tests.length,
      tests,
    });
  } catch (err) {
    console.error("FETCH BATCH TESTS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tests",
    });
  }
});
///////////////////////////////////////////
//////////////////////////////////////////
router.get("/marks/batch/:batchId/:examType/:examTitle", async (req, res) => {
    console.log("hitted");
  try {
    const { batchId,examType,examTitle } = req.params;
    console.log(req.params)
    // const { testTitle, examType } = req.query;

    if (!examTitle || !examType) {
      return res.status(400).json({
        success: false,
        message: "testTitle and examType are required",
      });
    }

    /* ---------------- CALCULATE TOTAL MARKS ---------------- */

    const totalMarksExpression =
      examType === "JEE"
        ? {
            $add: ["$physics", "$chemistry", "$math"],
          }
        : {
            $add: ["$physics", "$chemistry", "$botany", "$zoology"],
          };

    /* ---------------- AGGREGATION ---------------- */

    const results = await Marks.aggregate([
      {
        $match: {
          batch: new mongoose.Types.ObjectId(batchId),
          testTitle:examTitle,
          examType:examType
        },
      },
      {
        $addFields: {
          totalMarks: totalMarksExpression,
        },
      },
      {
        $sort: { totalMarks: -1 },
      },
      {
        $group: {
          _id: null,
          students: {
            $push: {
              student: "$student",
              rollNo: "$rollNo",
              totalMarks: "$totalMarks",
              physics: "$physics",
              chemistry: "$chemistry",
              math: "$math",
              botany: "$botany",
              zoology: "$zoology",
            },
          },
          highestMarks: { $first: "$totalMarks" },
          lowestMarks: { $last: "$totalMarks" },
          averageMarks: { $avg: "$totalMarks" },
          marksArray: { $push: "$totalMarks" },
        },
      },
      {
        $addFields: {
          totalStudents: { $size: "$students" },
          medianMarks: {
            $let: {
              vars: {
                mid: { $divide: [{ $size: "$marksArray" }, 2] },
              },
              in: {
                $cond: [
                  { $eq: [{ $mod: [{ $size: "$marksArray" }, 2] }, 0] },
                  {
                    $avg: [
                      { $arrayElemAt: ["$marksArray", { $subtract: ["$$mid", 1] }] },
                      { $arrayElemAt: ["$marksArray", "$$mid"] },
                    ],
                  },
                  { $arrayElemAt: ["$marksArray", { $floor: "$$mid" }] },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          students: {
            $map: {
              input: { $range: [0, { $size: "$students" }] },
              as: "idx",
              in: {
                $mergeObjects: [
                  { rank: { $add: ["$$idx", 1] } },
                  { $arrayElemAt: ["$students", "$$idx"] },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          students: 1,
          highestMarks: 1,
          lowestMarks: 1,
          averageMarks: { $round: ["$averageMarks", 2] },
          medianMarks: 1,
          totalStudents: 1,
        },
      },
    ]);

    if (!results.length) {
      return res.json({
        success: true,
        message: "No marks found",
        data: null,
      });
    }

    res.json({
      success: true,
      data: results[0],
    });
  } catch (err) {
    console.error("FETCH TEST MARKS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch test marks",
    });
  }
})


// // ✅ API to create a new batch
// router.post("/create", isLoggedIn, requireRole("superadmin"), async (req, res) => {
//   try {
//     console.log(req.body);
//     const { name, courseType, year } = req.body;
//     if (!name || !courseType || !year)
//       return res.status(400).json({ message: "All fields are required" });
//     const batch = new Batch({ name, courseType, year });
//     await batch.save();
//     res.status(201).json({ message: "Batch created successfully", batch });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // ✅ API to get all batches (for React Native)
// router.get("/", isLoggedIn, requireRole("superadmin"), async (req, res) => {
//   try {
//     const batches = await Batch.find().sort({ createdAt: -1 });
//     res.json(batches);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// });


// ///// grt route to add student to batch (ejs form) /////
// // Admin: Render add student page
// // Admin: Render add student page
// router.get("/add/:id",isLoggedIn,requireRole("admin"), async (req, res) => {
//   try {
//     res.render("batch/add-student", { batchId: req.params.id,
//       title: 'Add Student',
//       pageTitle: 'Add Student',
//       activePage: 'students',
//       messages:req.flash(),
//      });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching batches");
//   }
// });


// ///////////////////////////
// //Show Particular Batch
// //////////////////////////

// router.get("/:id", async (req, res) => {
//   const batchId = req.params.id;
//   const batch = await Batch.findById(batchId);
//   const studentsCount = await User.countDocuments({ batch: batchId });
//   const totalTests = await Marks.countDocuments({ batch: batchId }); // if test schema exists
//   const forms = await Form.find();
//   res.render("batch/particularBatch", {
//     batch,
//     studentsCount,
//     totalTests,
//     forms,
//     title: 'Batch Details',
//     pageTitle: 'Batch Details',
//     activePage: 'batches',
//     messages:req.flash(),
//   });
// });

// router.post("/:id/delete", async (req, res) => {
//   try {
//     const batchId = req.params.id;

//     // prevent deleting if batch doesn't exist
//     const batch = await Batch.findById(batchId);
//     if (!batch) {
//       req.flash("error", "Batch not found");
//       return res.redirect("/api/batches");
//     }
//     // delete only STUDENTS in that batch
//     const deletedUsers = await User.deleteMany({
//       batch: batchId,
//       role: "student"
//     });
//     await Batch.findByIdAndDelete(batchId);
//     req.flash("success", `Batch deleted successfully. Removed ${deletedUsers.deletedCount} students.`);
//     res.redirect("/api/batches");
//   } catch (err) {
//     console.log(err);
//     req.flash("error", "Error deleting batch.");
//     res.redirect("/api/batches");
//   }
// });




module.exports = router;
