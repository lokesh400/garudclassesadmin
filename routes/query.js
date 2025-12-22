const express = require("express");
const Query = require("../models/Query");
const FollowUp = require("../models/FollowUp");
const { isLoggedIn,requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/queries", isLoggedIn, requireRole("receptionist","admin","superadmin"), async (req, res) => {
  if(req.user.role==="receptionist"){
    const queries =  await Query.find({createdBy:req.user.id}).populate("createdBy").populate("closedBy").sort({createdAt:-1});
    res.render("query/allQuery", { queries,
    title: "All Queries",
    pageTitle: "All Queries",
    activePage: "queries",
   });
  }
  const queries =  await Query.find().populate("createdBy").populate("closedBy").sort({createdAt:-1});
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
  const followUps = await FollowUp.find({ queryId: req.params.id }).sort({ createdAt: -1 }); 
  res.render("query/viewQuery", { query,
    followUps,
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


/////////////////////////////////////
///////////// Follow-Ups /////////////
/////////////////////////////////////

router.post("/queries/:id/followups/new", isLoggedIn, requireRole("receptionist","admin","superadmin"), async (req, res) => {
  await FollowUp.create({
    queryId: req.params.id,
    note: req.body.note,
    createdAt: new Date(),
  });
  req.flash("success", "Follow-up added successfully");
  res.redirect(`/queries/${req.params.id}`);
});

module.exports = router;
