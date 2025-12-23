const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Otp = require("../models/Otp");
const crypto = require("crypto");
const { sendOtp } = require("../utils/mailer"); // update filename if different
const Brevo = require('@getbrevo/brevo');

/* ---------------- BREVO SETUP (WORKING) ---------------- */
const brevo = new Brevo.TransactionalEmailsApi();

// ✅ Correct way to set API key
brevo.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const contactApi = new Brevo.ContactsApi();
contactApi.setApiKey(
  Brevo.ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);
const transactionalApi = new Brevo.TransactionalEmailsApi();
// Function to unblock email if blacklisted
async function unblockIfBlacklisted(email) {
  try {
    await transactionalApi.deleteTransacBlockedContacts(email);
    console.log(`✅ Successfully unblocked email: ${email}`);
  } catch (e) {
    // Brevo throws error if email is NOT blocked → ignore safely
    if (e.response?.status === 404) {
      console.log('ℹ️ Email was not blocked');
    } else {
      console.error(
        '❌ Error unblocking email:',
        e.response?.body || e.message
      );
    }
  }
}



/* ---------------- OTP MAIL FUNCTION ---------------- */
async function sendOtpEmail(email, otp) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.templateId = 1; // ✅ transactional template ID
  mail.sender = {
    email: process.env.SENDER_EMAIL,
    name: process.env.SENDER_NAME
  };

  // ✅ pass dynamic values to template
  mail.params = {
    otp: otp
  };

  // ✅ force transactional (no unsubscribe)
  mail.headers = {
    'X-Mailin-transactional': 'true'
  };

  return brevo.sendTransacEmail(mail);
}

/* ---------------- ROUTE ---------------- */
// app.get('/mail', async (req, res) => {
//   try {
//     const email = "lokeshbadgujjar400@gmail.com";

//     const otp = Math.floor(100000 + Math.random() * 900000);

//     await sendOtpEmail(email, otp);

//     res.json({
//       success: true,
//       message: 'OTP sent successfully'
//     });
//   } catch (err) {
//     console.error(err.response?.data || err.message);
//     res.status(500).json({
//       success: false,
//       error: err.response?.data || err.message
//     });
//   }
// });


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
    const otp = code;
    const email = user.email;
    await unblockIfBlacklisted(email);
    await sendOtpEmail(email, otp);
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
