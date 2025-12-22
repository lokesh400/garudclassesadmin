const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Otp = require("../models/Otp");
const crypto = require("crypto");
const { sendOtp } = require("../utils/mailer"); // update filename if different

// RESET PAGE
router.get("/user/reset-password", (req, res) => {
  res.render("reset-password", {
    stage: "username",
    username: "",
    messages: req.flash(),
    title: "Reset Password",
    pageTitle: "Reset Password",
    activePage: "reset-password",
    layout: false,
  });
});

// SINGLE POST ROUTE
router.post("/reset-password", async (req, res) => {
  if (!req.body.stage || req.body.stage === "username") {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      req.flash("error", "Invalid username");
      return res.redirect("/reset-password");
    }
    const code = crypto.randomInt(100000, 999999).toString();
    // delete old otp
    await Otp.deleteMany({ userId: user._id });
    // save otp
    await Otp.create({
      userId: user._id,
      username,
      otp: code
    });
    const email = user.email;
    const subject = "Garud Classes Password Reset OTP";
    const message = "Dear User,\n\nYour OTP for password reset is: " + code + "\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nTeach Team Garud Classes";
    console.log("Sending OTP to:", email);
    await sendOtp(email, subject, message);
    req.flash("success", "OTP has been sent to your registered email");
    return res.render("reset-password", {
      stage: "otp",
      username,
      messages: req.flash(),
      title: "Reset Password",
      pageTitle: "Reset Password",
      activePage: "reset-password",
      layout: false,
    });
  }

  // =============================
  // STAGE 2 → OTP + PASSWORD
  // =============================

  if (req.body.stage === "otp") {
    const { username, otp, newPassword } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/reset-password");
    }

    const record = await Otp.findOne({ username, otp });

    if (!record) {
      req.flash("error", "Invalid OTP");
      return res.render("reset-password", {
        stage: "otp",
        username,
        messages: req.flash(),
        title: "Reset Password",
        pageTitle: "Reset Password",
        activePage: "reset-password",
        layout: false,
      });
    }

    // update password
    await user.setPassword(newPassword);
    await user.save();

    await Otp.deleteMany({ userId: user._id });

    req.flash("success", "Password updated successfully 🎉");
    return res.redirect("/login");
  }
});

module.exports = router;
