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
  const cType = (batch.courseType || '').toUpperCase()
  if (cType === 'JEE') coursePart = 'N'
  else if (cType === 'NEET') coursePart = 'M'
  else if (cType === 'FOUNDATION') coursePart = 'F'
  else if (cType === 'NDA') coursePart = 'A'
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

// ✅ Admin: create form for a specific batch automatically
router.post('/create-for-batch/:batchId', isLoggedIn, requireRole('admin'), async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = await Batch.findById(batchId);
    if (!batch) {
      req.flash('error', 'Batch not found');
      return res.redirect('back');
    }

    // Check if form already exists for this batch
    const existingForm = await Form.findOne({ batch: batchId });
    if (existingForm) {
      req.flash('error', 'A data collection form has already been created for this batch.');
      return res.redirect('back');
    }

    // Create a new form with default required student data fields
    const form = new Form({
      title: `Admission Form - ${batch.name}`,
      description: `Please fill this form to enroll in ${batch.name} (${batch.courseType} - ${batch.year})`,
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      batch: batchId,
      fields: [
        { label: 'NAME', type: 'text', required: true },
        { label: "FATHER'S NAME", type: 'text', required: true },
        { label: "MOTHER'S NAME", type: 'text', required: true },
        { label: 'ADDRESS', type: 'text', required: true }
      ]
    });

    await form.save();
    req.flash('success', `Data collection form created successfully for batch: ${batch.name}`);
    res.redirect('back');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create form for batch');
    res.redirect('back');
  }
});

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
    
    const name = req.body["NAME"] ? req.body["NAME"].trim().toLowerCase() : "";
    const emailNorm = email ? email.trim().toLowerCase() : "";
    const mobileNorm = mobileNumber ? mobileNumber.toString() : "";

    const submissions = await Submission.find({ form: form._id });
    const isDuplicate = submissions.some(sub => {
      const subName = sub.data && sub.data["NAME"] ? sub.data["NAME"].trim().toLowerCase() : "";
      const subMobile = sub.mobileNumber ? sub.mobileNumber.toString() : "";
      const subEmail = sub.email ? sub.email.trim().toLowerCase() : "";
      
      return subName === name &&
             subMobile === mobileNorm &&
             subEmail === emailNorm;
    });
    if (isDuplicate) {
      return res.send('Form Already Submitted with same Name, Mobile Number, and Email');
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
        const name = sub.data && sub.data["NAME"] ? sub.data["NAME"].trim().toLowerCase() : "";
        const mobile = sub.mobileNumber ? sub.mobileNumber.toString() : "";
        const email = sub.email ? sub.email.trim().toLowerCase() : "";
        const key = name + "|" + mobile + "|" + email;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, sub);
        }
      }
      const uniqueSubmissions = Array.from(uniqueMap.values());
      let createdUsers = 0;
      let skippedUsers = 0;
      for (const s of uniqueSubmissions) {
        const subName = s.data && s.data["NAME"] ? s.data["NAME"].trim() : "";
        const subMobile = s.mobileNumber ? s.mobileNumber : null;
        const subEmail = s.email ? s.email.trim() : "";

        if (subName && subEmail && subMobile) {
          const exist = await User.findOne({
            name: { $regex: new RegExp("^" + subName + "$", "i") },
            number: subMobile,
            email: { $regex: new RegExp("^" + subEmail + "$", "i") }
          });
          if (exist) {
            skippedUsers++;
            continue;
          }
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

// ✅ Admin: create form for a specific event automatically
router.post('/create-for-event/:eventId', isLoggedIn, requireRole('admin'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const Event = require('../models/Event.js');
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('back');
    }

    // Check if form already exists for this event
    const existingForm = await Form.findOne({ event: eventId });
    if (existingForm) {
      req.flash('error', 'A registration form has already been created for this event.');
      return res.redirect('back');
    }

    // Create a new form with default fields
    const form = new Form({
      title: `${event.name} Registration Form`,
      description: event.description || `Please fill this form to register for ${event.name}.`,
      date: new Date(event.date).toISOString().split('T')[0],
      time: '10:00 AM',
      event: eventId,
      fields: [
        { label: 'NAME', type: 'text', required: true },
        { label: "FATHER'S NAME", type: 'text', required: true },
        { label: "MOTHER'S NAME", type: 'text', required: true },
        { label: 'ADDRESS', type: 'text', required: true }
      ]
    });

    await form.save();
    req.flash('success', `Registration form created successfully for event: ${event.name}`);
    res.redirect('back');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server error while creating form');
    res.redirect('back');
  }
});


module.exports = router
