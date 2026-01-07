const express = require('express')
const router = express.Router()
const Form = require('../models/Form.js')
const User = require('../models/User.js')
const Batch = require('../models/Batch.js')
const Submission = require('../models/Submission.js')
const { isLoggedIn, requireRole } = require('../middleware/auth.js')
const ExcelJS = require('exceljs')
const { sendFormConfirmation } = require('../utils/mailer')

async function generateRollNumber (batch) {
  const yearPart = batch.year[2].toString() + batch.year[3].toString()
  const classPart = batch.name
  let coursePart = ''
  if (batch.courseType === 'JEE') coursePart = 'N'
  else if (batch.courseType === 'NEET') coursePart = 'M'
  else if (batch.courseType === 'Foundation') coursePart = 'F'
  else coursePart = 'X'
  const count = await User.countDocuments({ batch: batch._id })
  const seqPart = String(count + 1).padStart(3, '0')
  return `${yearPart}${classPart}${coursePart}${seqPart}`
}

// ✅ Admin: create form page
router.get('/create', isLoggedIn, requireRole('admin'), (req, res) => {
  res.render('forms/create', {
    title: 'Create New Form',
    pageTitle: 'Create New Form',
    activePage: 'forms'
  })
})

// ✅ Admin: save new form
router.post('/create', isLoggedIn, requireRole('admin'), async (req, res) => {
  try {
    const { title, description, date, time, fields } = req.body
    const form = new Form({
      title,
      description,
      date,
      time,
      fields: JSON.parse(fields) // frontend sends array of fields
    })
    await form.save()
    res.redirect('/forms/list')
  } catch (err) {
    console.error(err)
    res.redirect('/forms/create')
  }
})

//////////////////////////////////
///////delete form////////
//////////////////////////////////

router.post(
  '/delete/:id',
  isLoggedIn,
  requireRole('superadmin'),
  async (req, res) => {
    try {
      const formId = req.params.id
      await Form.findByIdAndDelete(formId)
      await Submission.deleteMany({ form: formId })
      req.flash('success', 'Form and all submissions deleted successfully.')
      res.redirect('/forms/list')
    } catch (err) {
      console.log(err)
      req.flash('error', 'Unable to delete form.')
      res.redirect('/forms/list')
    }
  }
)

// ✅ Admin: list forms of current club
router.get(
  '/list',
  isLoggedIn,
  requireRole('admin', 'receptionist'),
  async (req, res) => {
    try {
      const forms = await Form.find().sort({ createdAt: -1 })
      res.render('forms/list', {
        forms,
        title: 'All Forms',
        pageTitle: 'All Forms',
        activePage: 'forms',
        messages: req.flash()
      })
    } catch (err) {
      console.error(err)
      res.status(500).send('Error fetching forms')
    }
  }
)

////////////////////////////////////////////////////////
///////////////////////////////////////////////////////
//////////////////edit a form/////////////////////////
router.get("/edit/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.redirect("/admin/forms");

    res.render("forms/edit", { form ,
      title: "Edit Form",
      pageTitle: 'Edit Forms',
      activePage: 'forms',
    });
  } catch (err) {
    console.error(err);
    // res.redirect("/admin/forms");
    res.send(err)
  }
});

// UPDATE FORM
router.post("/edit/:id", async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      mobileNumber,
      email,
      fields,
      isActive,
    } = req.body;

    const updatedForm = await Form.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        date,
        time,
        mobileNumber,
        email,
        fields,
        isActive,
      },
      { new: true, runValidators: true }
    );

    if (!updatedForm) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    res.json({
      success: true,
      message: "Form updated successfully",
      form: updatedForm,
    });
  } catch (err) {
    console.error("FORM UPDATE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update form",
    });
  }
});

// ✅ Student: view & fill a form
router.get('/fill/:formId', async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    // ❌ Form not found
    if (!form) {
      return res.status(404).send('Form not found');
    }

    // 🔒 Form inactive
    if (form.isActive !== true) {
      return res.status(403).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Form Inactive</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fee2e2, #fecaca);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu;
    }
    .card {
      background: #fff;
      max-width: 420px;
      width: 90%;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      text-align: center;
      animation: fadeIn 0.4s ease;
    }
    .icon {
      font-size: 56px;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      color: #b91c1c;
    }
    p {
      margin: 14px 0 24px;
      color: #4b5563;
      font-size: 15px;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: #ef4444;
      color: #fff;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s ease;
    }
    .btn:hover {
      background: #dc2626;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚫</div>
    <h1>Form Currently Inactive</h1>
    <p>
      This form is not accepting responses at the moment.<br/>
      Please contact the administration or try again later.
    </p>
    <a href="javascript:history.back()" class="btn">Go Back</a>
  </div>
</body>
</html>
`);

    }

    // ✅ Render form
    res.render('forms/fill', { form, layout: false });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// ✅ Student: submit a form
router.post('/:formId/submit', async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId)
    if (!form) return res.status(404).send('Form not found')
    const { mobileNumber, email } = req.body
    const exist = await Submission.findOne({
      form: form._id,
      mobileNumber,
      email,
      NAME: req.body.NAME
    })
    if (exist) {
      res.send('Form Already Submitted with same Mobile Number, Email and Name')
    }
    const submission = new Submission({
      form: form._id,
      mobileNumber,
      email,
      data: req.body
    })
    await submission.save()
    const message = `Dear Student,\n\nYour Application for "${form.title}" has been successfully submitted.\n\nThank you.`
    await sendFormConfirmation(email, message)
    res.render('forms/submission-success', {
      form,
      layout: false,
      pageTitle: 'Submission Successful',
      title: 'Submission Successful',
      activePage: 'forms'
    })
  } catch (err) {
    console.error(err)
    res.redirect('back')
  }
})

// View Submissions
router.get(
  '/:id/submissions',
  isLoggedIn,
  requireRole('admin'),
  async (req, res) => {
    try {
      const form = await Form.findById(req.params.id)
      const submissions = await Submission.find({ form: req.params.id }).sort({
        createdAt: -1
      })
      res.render('forms/submissions', {
        form,
        submissions,
        title: 'Form Submissions - ' + form.title,
        pageTitle: 'Form Submissions - ' + form.title,
        activePage: 'forms'
      })
    } catch (err) {
      console.error(err)
      req.flash('error_msg', 'Failed to load submissions')
      res.redirect('/forms')
    }
  }
)

// Delete Submission
router.post(
  '/:formId/submission/:submissionId/delete',
  isLoggedIn,
  requireRole('superadmin'),
  async (req, res) => {
    try {
      await Submission.findByIdAndDelete(req.params.submissionId)
      req.flash('success_msg', 'Submission deleted successfully')
      res.redirect('back')
    } catch (err) {
      console.error(err)
      req.flash('error_msg', 'Failed to delete submission')
      res.redirect('back')
    }
  }
)

router.post(
  '/:formId/import/:batchId',
  isLoggedIn,
  requireRole('superadmin'),
  async (req, res) => {
    try {
      const { formId, batchId } = req.params;
      const batch = await Batch.findById(batchId);
      if (!batch) {
        req.flash('error', 'Batch not found');
        return res.redirect('back');
      }
      const submissions = await Submission.find({ form: formId });
      if (!submissions.length) {
        req.flash('error', 'No submissions found for this form.');
        return res.redirect('back');
      }
      const uniqueMap = new Map();
      for (const sub of submissions) {
        const key =
          sub.data["NAME"].trim().toLowerCase() + "|" +
          sub.data["FATHER'S NAME"].trim().toLowerCase() + "|" +
          sub.data["MOTHER'S NAME"].trim().toLowerCase();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, sub);
        }
      }
      const uniqueSubmissions = Array.from(uniqueMap.values());
      let createdUsers = 0;
      let skippedUsers = 0;
      for (const s of uniqueSubmissions) {
        const exist = await User.findOne({
          name: s.data["NAME"],
          fatherName: s.data["FATHER'S NAME"],
          motherName: s.data["MOTHER'S NAME"]
        });
        if (exist) {
          skippedUsers++;
          continue;
        }
        const roll = await generateRollNumber(batch);
        const user = new User({
          name: s.data["NAME"],
          fatherName: s.data["FATHER'S NAME"],
          motherName: s.data["MOTHER'S NAME"],
          address: s.data["ADDRESS"],
          batch: batchId,
          number: s.mobileNumber,
          email: s.email,
          username: roll,
          rollNumber: roll,
          role: 'student'
        });
        const password = Math.random().toString(36).slice(-8);
        await User.register(user, password);
        createdUsers++;
      }
      req.flash(
        'success',
        `Imported Successfully! Added: ${createdUsers}, Skipped: ${skippedUsers}`
      );
      res.redirect(`/api/batches/${batchId}`);
    } catch (err) {
      console.error(err);
      req.flash('error', 'Something went wrong');
      res.redirect('back');
    }
  }
);


module.exports = router
