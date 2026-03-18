const multer = require("multer");
const path = require("path");

// JD Upload
const jdStorage = multer.diskStorage({
  destination: "uploads/jd",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Staff Documents Upload
const staffStorage = multer.diskStorage({
  destination: "uploads/staff",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.fieldname + path.extname(file.originalname));
  }
});

const uploadJD = multer({ storage: jdStorage });

const uploadStaffDocs = multer({ storage: staffStorage });

module.exports = { uploadJD, uploadStaffDocs };
