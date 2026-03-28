const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");
const User = require("../models/User");
const { uploadStaffDocs } = require("./upload");
const { isAdmin } = require("../middleware/auth");

const staffUploadFields = [
  { name: "aadhaar" },
  { name: "pan" },
  { name: "resume" },
  { name: "offerLetter" },
  { name: "experienceLetter" },
  { name: "photo" },
  { name: "bankAccountPhoto" },
  { name: "otherDocument" },
];

const normalizePath = (filePath = "") => filePath.replace(/\\/g, "/");

const ALLOWED_STAFF_LINK_ROLES = ["admin", "superadmin", "receptionist", "teacher", "hr", "mts"];

const normalizeLinkedUsers = (linkedUsersInput) => {
  if (!linkedUsersInput) return [];
  return Array.isArray(linkedUsersInput) ? linkedUsersInput : [linkedUsersInput];
};

const validateAccountFields = ({ accountNumber = "", confirmAccountNumber = "" }) => {
  const account = String(accountNumber || "").trim();
  const confirm = String(confirmAccountNumber || "").trim();

  if ((account && !confirm) || (!account && confirm)) {
    return "Account number and confirm account number must both be filled.";
  }

  if (account && confirm && account !== confirm) {
    return "Account number and confirm account number must match.";
  }

  return null;
};

router.get("/new", isAdmin, async (req, res) => {
  const eligibleUsers = await User.find({ role: { $in: ALLOWED_STAFF_LINK_ROLES } })
    .select("name username role")
    .sort({ name: 1 })
    .lean();

  res.render("staff/new", {
    title: "Add Staff",
    pageTitle: "Add Staff",
    activePage: "staff",
    eligibleUsers,
  });
});

// ➕ Add Staff
router.post(
  "/add",
  isAdmin,
  uploadStaffDocs.fields(staffUploadFields),
  async (req, res) => {
    try {
      const accountValidationError = validateAccountFields(req.body);
      if (accountValidationError) {
        return res.status(400).send(accountValidationError);
      }

      const docs = {};
      for (let key in req.files) {
        docs[key] = normalizePath(req.files[key][0].path);
      }

      const payload = {
        ...req.body,
        linkedUsers: normalizeLinkedUsers(req.body.linkedUsers),
        salary: req.body.salary ? Number(req.body.salary) : null,
        joiningDate: req.body.joiningDate || null,
        documents: docs,
      };

      delete payload.confirmAccountNumber;

      await Staff.create({
        ...payload,
      });

      res.redirect("/admin/staff");
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// 📄 Get All Staff
router.get("/", isAdmin, async (req, res) => {
  const staff = await Staff.find().sort({ createdAt: -1 }).lean();
  res.render("staff/index", {
    staff,
    title: "Staff",
    pageTitle: "Staff",
    activePage: "staff",
  });
});

// 👁 View Staff Profile
router.get("/:id", isAdmin, async (req, res) => {
  const [staff, eligibleUsers] = await Promise.all([
    Staff.findById(req.params.id).populate("linkedUsers", "name username role").lean(),
    User.find({ role: { $in: ALLOWED_STAFF_LINK_ROLES } })
      .select("name username role")
      .sort({ name: 1 })
      .lean(),
  ]);

  if (!staff) {
    return res.status(404).send("Staff not found");
  }

  res.render("staff/view", {
    staff,
    eligibleUsers,
    title: "Staff Profile",
    pageTitle: "Staff Profile",
    activePage: "staff",
  });
});

// ✏️ Update Staff
router.post(
  "/:id/update",
  isAdmin,
  uploadStaffDocs.fields(staffUploadFields),
  async (req, res) => {
    const accountValidationError = validateAccountFields(req.body);
    if (accountValidationError) {
      return res.status(400).send(accountValidationError);
    }

    const existing = await Staff.findById(req.params.id).lean();
    if (!existing) {
      return res.status(404).send("Staff not found");
    }

    const updateData = {
      ...req.body,
      linkedUsers: normalizeLinkedUsers(req.body.linkedUsers),
      salary: req.body.salary ? Number(req.body.salary) : null,
      joiningDate: req.body.joiningDate || null,
      documents: { ...(existing.documents || {}) },
    };

    delete updateData.confirmAccountNumber;

    if (req.files && Object.keys(req.files).length) {
      for (let key in req.files) {
        updateData.documents[key] = normalizePath(req.files[key][0].path);
      }
    }

    await Staff.findByIdAndUpdate(req.params.id, updateData);
    res.redirect(`/admin/staff/${req.params.id}`);
  }
);

// 🔁 Toggle Active/Inactive
router.post("/:id/toggle-status", isAdmin, async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    return res.status(404).send("Staff not found");
  }

  staff.status = staff.status === "Active" ? "Inactive" : "Active";
  await staff.save();

  const redirectTo = req.body.redirectTo || "/admin/staff";
  res.redirect(redirectTo);
});

// ❌ Delete Staff
router.post("/:id/delete", isAdmin, async (req, res) => {
  await Staff.findByIdAndDelete(req.params.id);
  res.redirect("/admin/staff");
});

module.exports = router;
