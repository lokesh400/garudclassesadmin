const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const { sendUserCredentials, sendDeleteStaffOtpEmail, sendLoginOtpEmail } = require("../utils/mailer");
const { isLoggedIn, requireRole } = require("../middleware/auth");
const crypto = require("crypto");

const router = express.Router();

/* LOGIN PAGE */
router.get("/login", async (req, res) => {

  res.render("login",{
    title: "Login",
    pageTitle: "Login",
    activePage: "login",
    layout: false,
    messages: req.flash()
  });
});

/* LOGIN */
router.post("/login", (req, res, next) => {
  console.log("BODY:", req.body);

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("ERR:", err);
      req.flash("error", "Authentication error");
      return next(err);
    }
    if (!user) {
      console.log("LOGIN FAILED:", info);
      req.flash("error", info.message);
      return res.redirect("/login");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.loginOtp = {
      userId: user._id.toString(),
      otp: code,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    if (user.email) {
      sendLoginOtpEmail(user.email, user.name || user.username, code).catch(err => console.error("OTP send error:", err));
    }

    req.flash("success", "Please check your email for the OTP");
    return res.redirect("/verify-login-otp");
  })(req, res, next);
});

router.get("/verify-login-otp", (req, res) => {
  if (!req.session.loginOtp) {
    req.flash("error", "No active login attempt.");
    return res.redirect("/login");
  }
  res.render("verify-login-otp", {
    title: "Verify OTP",
    pageTitle: "Verify OTP",
    activePage: "login",
    layout: false,
    messages: req.flash()
  });
});

router.post("/verify-login-otp", async (req, res, next) => {
  try {
    const { otp } = req.body;
    const sessionOtp = req.session.loginOtp;

    if (!sessionOtp) {
      req.flash("error", "No active login attempt.");
      return res.redirect("/login");
    }

    if (Date.now() > sessionOtp.expiresAt) {
      req.flash("error", "OTP has expired. Please login again.");
      req.session.loginOtp = null;
      return res.redirect("/login");
    }

    if (sessionOtp.otp !== otp.toString().trim()) {
      req.flash("error", "Invalid OTP.");
      return res.redirect("/verify-login-otp");
    }

    const user = await User.findById(sessionOtp.userId);
    if (!user) {
      req.flash("error", "User not found.");
      req.session.loginOtp = null;
      return res.redirect("/login");
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      req.session.loginOtp = null; // Clear OTP

      if (user.role === "receptionist") {
        req.flash("success", "Login successful");
        return res.redirect("/receptionist");
      }
      if (user.role === "admin") {
        req.flash("success", "Login successful");
        return res.redirect("/admin/only");
      }
      if (user.role === "onboarding") {
        req.flash("success", "Welcome! Please complete your onboarding.");
        return res.redirect("/onboarding/portal");
      }
      if (user.role === "student") {
        req.flash("success", "Please Login to your student portal");
        return res.redirect("/login");
      }
      if (["teacher", "hr", "mts"].includes(user.role)) {
        req.flash("success", "Login successful");
        return res.redirect("/staff/documents");
      }
      console.log("LOGIN SUCCESS:", user.username);
      req.flash("success", "Login successful");
      return res.redirect("/admin");
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get("/receptionist", (req, res) => {
  res.render("receptionist", {
    title: "Receptionist Dashboard",
    pageTitle: "Receptionist Dashboard",
    activePage: "receptionist-dashboard",
  });
});

router.get("/admin/only", (req, res) => {
  res.render("adminOnly", {
    title: "Admin Dashboard",
    pageTitle: "Admin Dashboard",
    activePage: "admin-dashboard",
  });
});
/* REGISTER (ADMIN CAN CREATE USERS) */
// router.get("/register", async (req, res) => {
//   res.render("auth/register");
// });

// router.post("/register", async (req, res) => {
//   const { username, password, role, name } = req.body;

//   await User.register(
//     new User({ username, role, name }),
//     password
//   );

//   res.redirect("/login");
// });

/* LOGOUT */
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});


///////////New 

/* LIST USERS */
router.get("/teachers/all", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const users = await User.find({
    $or: [
    { role: "admin" },
    { role: "superadmin" },
    { role: "receptionist" },
    { role: "teacher" }
  ]
  })
  res.render("users/list.ejs", {
    users,
    title: "Users",
    activePage: "users",
    pageTitle: "Users",
  });
});

router.get("/teachers/new", isLoggedIn,requireRole("superadmin"), (req, res) => {
  res.render("users/new", { title: "Add User" ,
    pageTitle: "Add User",
    activePage: "users",
  });
});

/* CREATE USER */
router.post("/teachers/new", isLoggedIn, requireRole("superadmin"), async (req, res) => {
 function generateStrongPassword(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz" +
    "0123456789" +
    "!@#$%^&*()_+[]{}<>?";
  const randomBytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
  }
  const { name, username, role, email} = req.body;
  const password = generateStrongPassword(8);
  const user = new User({ name, username, role, email });
  await User.register(user, password);
  await sendUserCredentials(email, username, password);
  res.redirect("/teachers/all");
});

/* EDIT FORM */
router.get("/teachers/:id/edit", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render("users/edit", { user,
    title: "Edit User",
    pageTitle: "Edit User",
    activePage: "users",
    id: req.params.id
   });
});

/* UPDATE USER */
router.post("/teachers/:id/edit", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const { name, username, email, role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { name, username, email, role });
  res.redirect("/teachers/all");
});

/* REQUEST DELETE USER OTP */
router.post("/teachers/:id/delete-request", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }

    const adminEmail = req.user.email;
    if (!adminEmail) {
      return res.status(400).json({ success: false, message: "No active email registered for your administrator account. Please configure an email address." });
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store details in session
    req.session.userDeleteOtp = {
      userId: userToDelete._id.toString(),
      otp: code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
    };

    // Send email with OTP to current logged-in user
    await sendDeleteStaffOtpEmail(adminEmail, userToDelete.name, code);

    res.json({ success: true, message: `OTP sent to your administrator email (${adminEmail}).` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* DELETE USER (Requires OTP) */
router.post("/teachers/:id/delete", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required." });
    }

    const sessionOtp = req.session.userDeleteOtp;
    if (!sessionOtp) {
      return res.status(400).json({ success: false, message: "No active delete request found. Please request OTP again." });
    }

    if (sessionOtp.userId !== req.params.id) {
      return res.status(400).json({ success: false, message: "Inconsistent user ID. Please request OTP again." });
    }

    if (sessionOtp.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Invalid OTP. Please check and try again." });
    }

    if (Date.now() > sessionOtp.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
    }

    await User.findByIdAndDelete(req.params.id);

    // Clear session OTP
    req.session.userDeleteOtp = null;

    res.json({ success: true, message: "User account deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
