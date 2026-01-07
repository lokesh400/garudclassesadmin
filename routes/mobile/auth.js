const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../../models/User");

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
