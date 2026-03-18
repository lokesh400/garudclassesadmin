function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  if (!req.user || req.user.isActive !== true) {
    req.logout(function (err) {
      if (err) return next(err);
      req.flash(
        "success",
        "Your account is inactive. Please contact the administration."
      );
      return res.redirect("/login");
    });
    return;
  }
  next();
}


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect("/login");
}

function isAdmin(req, res, next) {
  if (
    req.isAuthenticated() &&
    (req.user.role === "admin" || req.user.role === "superadmin")
  ) {
    return next();
  }
  return res.status(403).send("Forbidden");
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/login");
    }
    if (req.user.role === "superadmin") {
      return next();
    }

    if (roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).render("protected", {
      title: "Access Denied",
      pageTitle: "Access Denied",
      layout: false,
    });
  };
}

// Alias (optional, same as isLoggedIn)
const protect = isLoggedIn;


module.exports = { isLoggedIn, requireRole, ensureAuthenticated, isAdmin, protect };
