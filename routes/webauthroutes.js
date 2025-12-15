const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const { sendUserCredentials } = require("../utils/mailer");
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
  });
});

/* LOGIN */
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
      console.log("LOGIN SUCCESS:", user.username);
      return res.redirect("/admin");
    });
  })(req, res, next);
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
    { role: "superadmin" }
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
  const { name, role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { name, role });
  res.redirect("/teachers/all");
});

/* DELETE USER */
router.post("/teachers/:id/delete", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect("/teachers/all");
});

module.exports = router;
