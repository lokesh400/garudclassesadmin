const multer = require("multer");
const path = require("path");

const pdfFileFilter = (req, file, cb) => {
  const isPdf = path.extname(file.originalname).toLowerCase() === ".pdf";
  if (!isPdf) {
    return cb(new Error("Only PDF files are allowed"));
  }
  return cb(null, true);
};

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

// Recruitment Resume Upload (in-memory for Cloudinary streaming)
const resumeStorage = multer.memoryStorage();

const uploadJD = multer({
  storage: jdStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const uploadStaffDocs = multer({ storage: staffStorage });

const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = { uploadJD, uploadStaffDocs, uploadResume };
