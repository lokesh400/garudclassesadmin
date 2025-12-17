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
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      console.log("LOGIN SUCCESS:", req.user.id);
      res.json({
         loggedIn: true,
         user: req.user.email,
         userId: req.user.id
  });
    });
  })(req, res, next);
});

// Check session
router.get("/check", (req, res) => {
  console.log("CHECK SESSION:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    console.log("USER LOGGED IN:", req.user.id);
    res.json({ loggedIn: true, user: req.user.email,userId: req.user.id });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.json({ loggedIn: false });
  });
});

module.exports = router;
