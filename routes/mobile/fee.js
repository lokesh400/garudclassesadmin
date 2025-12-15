const express = require("express");
const Fee = require("../../models/Fee");
const router = express.Router();
const {isLoggedIn} = require("../../middleware/auth");

// CREATE / UPDATE FEE FOR A STUDENT
// router.post("/create", isLoggedIn, async (req, res) => {
//   try {
//     const { student, admissionFee, tuitionFee, transportFee, otherFee } = req.body;

//     let feeDoc = await Fee.findOne({ student });

//     if (!feeDoc) {
//       feeDoc = new Fee({
//         student,
//         admissionFee,
//         tuitionFee,
//         transportFee,
//         otherFee,
//       });
//     } else {
//       feeDoc.admissionFee = admissionFee;
//       feeDoc.tuitionFee = tuitionFee;
//       feeDoc.transportFee = transportFee;
//       feeDoc.otherFee = otherFee;
//     }

//     await feeDoc.save();
//     res.json({ success: true, fee: feeDoc });

//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// GET FEE DATA FOR A STUDENT
router.get("/:studentId", isLoggedIn, async (req, res) => {
    console.log("Fetching fee data for student ID:", req.params.studentId);
  try {
    const fee = await Fee.findOne({ student: req.params.studentId }).populate("student");
    res.json({ success: true, fee });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ADD PAYMENT
router.post("/add-payment/:studentId", isLoggedIn, async (req, res) => {
  try {
    const { amount, mode } = req.body;
    const fee = await Fee.findOne({ student: req.params.studentId });

    if (!fee) {
      return res.status(404).json({ success: false, message: "Fee record not found" });
    }

    await fee.addPayment({ amount, mode });

    res.json({ success: true, fee });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
