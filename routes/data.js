const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const Fee = require("../models/Fee");
const Otp = require("../models/Otp");
const Attendance = require("../models/Attendance");
const Query = require("../models/Query");
const StudioBooking = require("../models/StudioBooking");
const { isLoggedIn } = require("../middleware/auth");

const router = express.Router();

// router.get("/data/delete", (req, res) => {
//   res.status(200).json({
//     message: "Data deletion is restricted.",
//     purpose:
//       "Student data is kept as a digital reference for managing students, attendance, fees, and academic records.",
//     deleteRoute: "DELETE /data/delete/:id",
//     deleteRouteAlt: "POST /data/delete",
//     studentDeletionRequestsAllowed: false,
//     note:
//       "Students cannot request data deletion. Only superadmin can process deletion in exceptional internal cases."
//   });
// });

// function requireSuperadminForDeletion(req, res, next) {
//   if (!req.isAuthenticated || !req.isAuthenticated()) {
//     return res.status(401).json({ message: "Authentication required" });
//   }

//   if (!req.user || req.user.role !== "superadmin") {
//     return res.status(403).json({
//       message:
//         "Students and non-superadmin users are not allowed to request or perform data deletion."
//     });
//   }

//   next();
// }

// async function deleteUserData(targetUserId, deleteReason) {
//   const targetUser = await User.findById(targetUserId);
//   if (!targetUser) {
//     return { status: 404, payload: { message: "User not found" } };
//   }

//   if (targetUser.role === "superadmin") {
//     return {
//       status: 403,
//       payload: { message: "Superadmin account cannot be deleted via this route" }
//     };
//   }

//   await Promise.all([
//     Fee.deleteMany({ student: targetUserId }),
//     Otp.deleteMany({ userId: targetUserId }),
//     Query.deleteMany({ $or: [{ createdBy: targetUserId }, { closedBy: targetUserId }] }),
//     StudioBooking.deleteMany({ teacher: targetUserId }),
//     Attendance.updateMany(
//       { [`present.${targetUserId}`]: { $exists: true } },
//       { $unset: { [`present.${targetUserId}`]: "" } }
//     )
//   ]);

//   await User.findByIdAndDelete(targetUserId);

//   return {
//     status: 200,
//     payload: {
//       message: "User and linked records deleted successfully",
//       userId: targetUserId,
//       deleteReason: deleteReason || "No reason provided",
//       retentionReason:
//         "Data is normally used as a digital reference for managing students and institute operations."
//     }
//   };
// }

// router.delete("/data/delete/:id", isLoggedIn, requireSuperadminForDeletion, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { reason } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Invalid user id" });
//     }

//     const result = await deleteUserData(id, reason);
//     return res.status(result.status).json(result.payload);
//   } catch (error) {
//     console.error("Delete route error:", error);
//     return res.status(500).json({ message: "Server error while deleting data" });
//   }
// });

// router.post("/data/delete", isLoggedIn, requireSuperadminForDeletion, async (req, res) => {
//   try {
//     const { userId, reason } = req.body;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ message: "Valid userId is required" });
//     }

//     const result = await deleteUserData(userId, reason);
//     return res.status(result.status).json(result.payload);
//   } catch (error) {
//     console.error("Delete route error:", error);
//     return res.status(500).json({ message: "Server error while deleting data" });
//   }
// });

module.exports = router;
