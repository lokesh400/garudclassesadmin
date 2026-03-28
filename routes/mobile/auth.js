const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../../models/User");
const Otp = require("../../models/Otp");
const crypto = require("crypto");
const Brevo = require("@getbrevo/brevo");

const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();

const transactionalApi = new Brevo.TransactionalEmailsApi();
if (BREVO_API_KEY) {
  transactionalApi.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
}

async function unblockIfBlacklisted(email) {
  try {
    await transactionalApi.deleteTransacBlockedContacts(email);
  } catch (error) {
    // Brevo returns 404 when contact is not blocked.
    if (error?.response?.status !== 404) {
      console.error("Failed to unblock email:", error?.response?.body || error.message);
    }
  }
}

async function sendOtpEmail(email, otp) {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.templateId = 1;
  mail.sender = {
    email: process.env.SENDER_EMAIL,
    name: process.env.SENDER_NAME,
  };
  mail.params = { otp };
  mail.headers = { "X-Mailin-transactional": "true" };

  return transactionalApi.sendTransacEmail(mail);
}

async function sendResetLinkEmail(email, resetLink) {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.sender = {
    email: process.env.SENDER_EMAIL,
    name: process.env.SENDER_NAME,
  };
  mail.subject = "Reset Your Password";
  mail.htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 8px;">Reset Password Request</h2>
        <p style="margin-top: 0;">We received a request to reset your password.</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; background: #1f6feb; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 13px; color: #4b5563;">This link expires in 5 minutes.</p>
        <p style="font-size: 13px; color: #4b5563; word-break: break-all;">If the button does not work, open this link:<br/>${resetLink}</p>
      </body>
    </html>
  `;

  return transactionalApi.sendTransacEmail(mail);
}

function getIdentifier(body = {}) {
  const rawValue =
    body.username ||
    body.identifier ||
    body.usernameOrEmail ||
    body.email;

  return typeof rawValue === "string" ? rawValue.trim() : "";
}

async function findUserByIdentifier(identifier) {
  if (!identifier) return null;

  return User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function buildResetLink(token) {
  const baseLink = "https://garudclasseserp.onrender.com/auth/m/reset-password";

  const separator = baseLink.includes("?") ? "&" : "?";
  return `${baseLink}${separator}token=${encodeURIComponent(token)}`;
}

async function resetPasswordByToken({ token, newPassword, identifier }) {
  const cleanToken = String(token || "").trim();
  const cleanPassword = String(newPassword || "").trim();

  if (!cleanToken || !cleanPassword) {
    return {
      ok: false,
      status: 400,
      message: "token and newPassword are required",
    };
  }

  const tokenRecord = await Otp.findOne({ otp: cleanToken });
  if (!tokenRecord) {
    return {
      ok: false,
      status: 404,
      message: "Invalid or expired reset token",
    };
  }

  const user = await User.findById(tokenRecord.userId);
  if (!user) {
    await Otp.deleteMany({ userId: tokenRecord.userId });
    return {
      ok: false,
      status: 404,
      message: "User not found",
    };
  }

  if (identifier) {
    const matchedUser = await findUserByIdentifier(identifier);
    if (!matchedUser || String(matchedUser._id) !== String(user._id)) {
      return {
        ok: false,
        status: 400,
        message: "Token does not match this user",
      };
    }
  }

  await user.setPassword(cleanPassword);
  await user.save();
  await Otp.deleteMany({ userId: user._id });

  return {
    ok: true,
    status: 200,
    message: "Password reset successful",
  };
}

async function handleForgotPassword(req, res) {
  try {
    const identifier = getIdentifier(req.body);

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "username or email is required",
      });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "No email is linked to this account",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetLink = buildResetLink(resetToken);

    await Otp.deleteMany({ userId: user._id });
    await Otp.create({
      userId: user._id,
      username: user.username,
      otp: resetToken,
    });

    await unblockIfBlacklisted(user.email);
    await sendResetLinkEmail(user.email, resetLink);

    return res.json({
      success: true,
      message: "Reset password link sent successfully",
      email: user.email,
      sentTo: user.email,
      sentEmail: user.email,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send reset password mail",
    });
  }
}

async function handleResetPassword(req, res) {
  try {
    const identifier = getIdentifier(req.body);
    const token = String(req.body?.token || req.body?.resetToken || req.body?.otp || "").trim();
    const newPassword = req.body?.newPassword || req.body?.password;
    const result = await resetPasswordByToken({ token, newPassword, identifier });

    return res.status(result.status).json({
      success: result.ok,
      message: result.message,
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
  }
}

router.get("/m/reset-password", async (req, res) => {
  const token = String(req.query?.token || "").trim();

  if (!token) {
    return res.status(400).send("<h3>Invalid or missing reset token.</h3>");
  }

  const exists = await Otp.findOne({ otp: token });
  if (!exists) {
    return res.status(400).send("<h3>This reset link is invalid or expired.</h3>");
  }

  return res.send(`
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 24px;">
        <div style="max-width: 420px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
          <h2 style="margin-top: 0; color: #111827;">Reset Password</h2>
          <form method="POST" action="/auth/m/reset-password" style="display: grid; gap: 10px;">
            <input type="hidden" name="token" value="${token}" />
            <label style="font-size: 14px; color: #374151;">New Password</label>
            <input id="newPassword" type="password" name="newPassword" required minlength="6" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;" />
            <label style="font-size: 14px; color: #374151;">Confirm Password</label>
            <input id="confirmPassword" type="password" name="confirmPassword" required minlength="6" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;" />
            <button id="togglePasswords" type="button" style="justify-self: start; border: 0; background: transparent; color: #1f6feb; font-size: 13px; padding: 0; cursor: pointer;">
              Show Passwords
            </button>
            <button type="submit" style="margin-top: 4px; padding: 10px; border: 0; border-radius: 8px; background: #1f6feb; color: #fff; font-weight: 600; cursor: pointer;">Update Password</button>
          </form>
        </div>
        <script>
          const newPasswordInput = document.getElementById("newPassword");
          const confirmPasswordInput = document.getElementById("confirmPassword");
          const togglePasswordsButton = document.getElementById("togglePasswords");

          if (newPasswordInput && confirmPasswordInput && togglePasswordsButton) {
            togglePasswordsButton.addEventListener("click", () => {
              const show = newPasswordInput.type === "password";
              newPasswordInput.type = show ? "text" : "password";
              confirmPasswordInput.type = show ? "text" : "password";
              togglePasswordsButton.textContent = show ? "Hide Passwords" : "Show Passwords";
            });
          }
        </script>
      </body>
    </html>
  `);
});

router.post("/m/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "").trim();
    const confirmPassword = String(req.body?.confirmPassword || "").trim();

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).send("<h3>All fields are required.</h3>");
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send("<h3>Passwords do not match.</h3>");
    }

    const result = await resetPasswordByToken({ token, newPassword });
    if (!result.ok) {
      return res.status(result.status).send(`<h3>${result.message}</h3>`);
    }

    return res.send("<h3>Password updated successfully. You can now log in from the app.</h3>");
  } catch (error) {
    console.error("WEB RESET PASSWORD ERROR:", error);
    return res.status(500).send("<h3>Unable to reset password right now. Please try again.</h3>");
  }
});

// Compatible endpoint for apps that call /auth/reset-password for either stage.
router.post("/reset-password", async (req, res) => {
  const hasOtpData = Boolean(
    String(req.body?.otp || "").trim() && (req.body?.newPassword || req.body?.password)
  );

  if (hasOtpData) {
    return handleResetPassword(req, res);
  }

  return handleForgotPassword(req, res);
});

router.post("/forgot-password", handleForgotPassword);
router.post("/forgotPassword", handleForgotPassword);
router.post("/reset-password-request", handleForgotPassword);
router.post("/request-reset-token", handleForgotPassword);

router.post("/confirm-reset-password", handleResetPassword);
router.post("/reset-password/confirm", handleResetPassword);
router.post("/reset-password-token", handleResetPassword);

// Register (For Admin Only)
// Use this once to create parent accounts
// router.post("/register", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = new User({ email });
//     await User.register(user, password);

//     res.json({ message: "User registered successfully" });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });


router.post("/login", (req, res, next) => {
  console.log("BODY:", req.body);

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("ERR:", err);
      return next(err);
    }

    if (!user) {
      console.log("LOGIN FAILED:", info);
      return res.status(401).json({
        loggedIn: false,
        message: info?.message || "Invalid email or password",
      });
    }

    // 🔒 CHECK IF USER IS ACTIVE
    if (user.isActive !== true) {
      console.log("INACTIVE USER ATTEMPT:", user.email);

      return res.status(403).json({
        loggedIn: false,
        message: "Your account is inactive. Please contact the administration.",
      });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      console.log("LOGIN SUCCESS:", user.id);
      return res.json({
        loggedIn: true,
        user: user.email,
        userId: user.id,
        role: user.role,
      });
    });
  })(req, res, next);
});

router.get("/check", (req, res) => {
  console.log("CHECK SESSION:", req.isAuthenticated());

  if (!req.isAuthenticated()) {
    return res.json({ loggedIn: false });
  }

  // 🔒 ACTIVE CHECK
  if (!req.user || req.user.isActive !== true) {
    req.logout(function (err) {
      if (err) console.error(err);
      return res.json({
        loggedIn: false,
        message: "Account inactive",
      });
    });
    return;
  }

  console.log("USER LOGGED IN:", req.user.id);

  res.json({
    loggedIn: true,
    user: req.user.email,
    userId: req.user.id,
    role: req.user.role,
  });
});



// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.json({ loggedIn: false });
  });
});

module.exports = router;
