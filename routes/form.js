const express = require("express");
const router = express.Router();
const Form = require("../models/Form.js");
const Submission = require("../models/Submission.js");
const {ensureAuthenticated, requireRole} = require("../middleware/auth.js");
const ExcelJS = require("exceljs");
  
async function generateRollNumber() {
  const yearPart = batch.year.slice(-2);
  const classPart = batch.name
  let coursePart = '';
  if (batch.courseType === 'JEE') coursePart = 'N';
  else if (batch.courseType === 'NEET') coursePart = 'M';
  else if (batch.courseType === 'Foundation') coursePart = 'F';
  else coursePart = 'X';
  const count = await User.countDocuments({ batch: batch._id});
  const seqPart = String(count + 1).padStart(3, '0');
  return `${yearPart}${classPart}${coursePart}${seqPart}`;
}

// ✅ Admin: create form page
router.get("/create", ensureAuthenticated, requireRole("admin", "superadmin"), (req, res) => {
  res.render("forms/create",{
      title: 'Create New Form',
      pageTitle: 'Create New Form',
      activePage: 'forms',
  });
});

// ✅ Admin: save new form
router.post("/create", ensureAuthenticated, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const { title, description, date, time, fields } = req.body;
    const form = new Form({
      title,
      description,
      date,
      time,
      fields: JSON.parse(fields) // frontend sends array of fields
    });
    await form.save();
    res.redirect("/forms/list-all");
  } catch (err) {
    console.error(err);
    res.redirect("/forms/create");
  }
});

// ✅ Admin: list forms of current club
router.get("/list", ensureAuthenticated, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const forms = await Form.find().sort({ createdAt: -1 });
    res.render("forms/list", { forms,
      title: 'All Forms',
      pageTitle: 'All Forms',
      activePage: 'forms',
     });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching forms");
  }
});

// ✅ Student: view & fill a form
router.get("/fill/:formId", async (req, res) => {
  const form = await Form.findById(req.params.formId);
  if (!form) return res.status(404).send("Form not found");
  res.render("forms/fill", { form, layout: false });  
   });


// ✅ Student: submit a form
router.post("/:formId/submit", async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) return res.status(404).send("Form not found");
    const { mobileNumber, email } = req.body;
    const submission = new Submission({
      form: form._id,
      mobileNumber,
      email,
      data: req.body
    });
    await submission.save();
    res.redirect(`/forms/fill/${form._id}`);
  } catch (err) {
    console.error(err);
    res.redirect("back");
  }
});

// View Submissions
router.get("/:id/submissions", ensureAuthenticated, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const form = await Form.findById(req.params.id)
    const submissions = await Submission.find({ form: req.params.id }).sort({ createdAt: -1 });
    res.render("forms/submissions", { form, submissions,
      title: 'Form Submissions - ' + form.title,
      pageTitle: 'Form Submissions - ' + form.title,
      activePage: 'forms', });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load submissions");
    res.redirect("/forms");
  }
});

module.exports = router;
