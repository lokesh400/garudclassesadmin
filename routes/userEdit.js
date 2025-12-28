const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const { sendUserCredentials } = require("../utils/mailer");
const { isLoggedIn, requireRole } = require("../middleware/auth");
const crypto = require("crypto");

const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
const fs = require("fs");

const router = express.Router();

/* LOGIN PAGE */
router.get("/edit/user/details", async (req, res) => {
  res.render("user/login",{
    title: "Login",
    pageTitle: "Login",
    activePage: "login",
    layout: false,
    messages: req.flash()
  });
});

/* LOGIN */
router.post("/edit/user/details", (req, res, next) => {

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("ERR:", err);
      req.flash("error", "Authentication error");
      return next(err);
    }
    if (!user) {
      console.log("LOGIN FAILED:", info);
      req.flash("error", info.message);
      return res.redirect("/edit/user/details");
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      if (user) {
        const user  = req.user
        return res.redirect(`/user/edit/${user.id}`,);
      }
    //   console.log("LOGIN SUCCESS:", user.username);
    //   req.flash("success", "Login successful");
    //   return res.redirect("/admin");
    });
  })(req, res, next);
});

router.get("/user/edit/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    // User not found
    if (!user) {
      return res.status(404).render("error/editStudentData", {
        layout: false,
        title: "Error",
        pageTitle: "User Not Found",
        activePage: "error"
      });
    }

    // Editing NOT allowed
    if (user.editAllowed === false) {
      return res.render("error/editStudentData", {
        layout: false,
        title: "Error",
        pageTitle: "Editing Not Allowed",
        activePage: "error"
      });
    }

    // Editing allowed (true OR undefined)
    return res.render("user/editDetails", {
      title: "Edit Details",
      pageTitle: "Student Dashboard",
      activePage: "student-dashboard",
      layout: false,
      user
    });

  } catch (err) {
    console.error(err);
    return res.status(500).render("error/editStudentData", {
      layout: false,
      title: "Error",
      pageTitle: "Server Error",
      activePage: "error"
    });
  }
});


// Update profile
router.post(
  "/user/profile/edit",
  isLoggedIn,
  upload.single("image"),
  async (req, res) => {
    try {
      let imageUrl = req.user.image;
      const {name,email,number,address,fatherName,motherName} = req.body;
      if(req.body.username === req.user.username){
         if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "users"
        });
        imageUrl = result.secure_url;
        fs.unlinkSync(req.file.path);
      }
      await User.findByIdAndUpdate(req.user._id, {
        name,
        email,
        number,
        address,
        fatherName,
        motherName,
        image: imageUrl,
        editAllowed:false
      });
      req.flash("success", "Profile updated successfully");
      res.redirect(`/user/edit/${req.user.id}`);
      } else {
        res.send("Data Tampered Not Saved")
      }
    } catch (err) {
      console.error(err);
      req.flash("error", "Profile update failed");
      res.redirect("back");
    }
  }
);

// router.get("/admin/only", (req, res) => {
//   res.render("adminOnly", {
//     title: "Admin Dashboard",
//     pageTitle: "Admin Dashboard",
//     activePage: "admin-dashboard",
//   });
// });

module.exports = router;
