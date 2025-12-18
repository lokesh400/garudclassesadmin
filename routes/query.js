const express = require("express");
const Query = require("../models/Query");
const { isLoggedIn,requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/queries", isLoggedIn, requireRole("receptionist","admin","superadmin"), async (req, res) => {
  const queries = await Query.find()
    .populate("createdBy")
    .populate("closedBy");
  res.render("query/allQuery", { queries,
    title: "All Queries",
    pageTitle: "All Queries",
    activePage: "queries",
   });
});

router.get("/queries/new",isLoggedIn, requireRole("receptionist","admin","superadmin"), (req, res) => {
  res.render("query/addQuery",{
    title: "Add New Query",
    pageTitle: "Add New Query",
    activePage: "queries",
   });  
  });

router.post("/queries/new", isLoggedIn, requireRole("receptionist","admin","superadmin"), async (req, res) => {
  await Query.create({
    studentName: req.body.studentName,
    description: req.body.description,
    createdBy: req.user.id,
    mobileNumber: req.body.mobileNumber,
    createdAt: new Date(),
  });
  res.redirect("/queries");
});

router.get("/queries/:id",isLoggedIn, requireRole("receptionist","admin","superadmin"), async (req, res) => {
  const query = await Query.findById(req.params.id)
    .populate("createdBy")
    .populate("closedBy");
  res.render("query/viewQuery", { query,
    title: "View Query",
    pageTitle: "View Query",
    activePage: "queries",
   });
});

router.post("/queries/:id/close",isLoggedIn, requireRole("receptionist","admin","superadmin"), async (req, res) => {
  await Query.findByIdAndUpdate(req.params.id, {
    status: "Closed",
    remarks: req.body.remarks,
    closedBy: req.user.id,
    closedAt: new Date(),
  });
  res.redirect("/queries");
});

module.exports = router;
