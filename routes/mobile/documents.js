const express = require("express");
const router = express.Router();
const multer = require("multer");
const User = require("../../models/User");
const { cloudinary, documentsConfig } = require("../../config/documentsCloudinary");

// Setup multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const ALLOWED_DOCUMENTS = [
  "studentPhoto",
  "class10Marksheet",
  "class12Marksheet",
  "aadharCard",
  "fatherAadharCard",
  "motherAadharCard",
];

/**
 * Uploads a buffer to Cloudinary using the specific configuration for documents.
 */
const uploadToDocumentsCloudinary = (fileBuffer, name) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "student_documents",
        resource_type: "auto",
        ...documentsConfig,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Helper to build the documents response structure.
 */
const buildDocumentsResponse = (student) => {
  return {
    class10Marksheet: student.class10Marksheet?.url ? student.class10Marksheet : null,
    class12Marksheet: student.class12Marksheet?.url ? student.class12Marksheet : null,
    aadharCard: student.aadharCard?.url ? student.aadharCard : null,
    fatherAadharCard: student.fatherAadharCard?.url ? student.fatherAadharCard : null,
    motherAadharCard: student.motherAadharCard?.url ? student.motherAadharCard : null,
  };
};

/**
 * POST /api/mobile/documents/upload
 * Form-data:
 * - file (the image/document)
 * - studentId (the student user ID)
 * - name (the document type, must be one of ALLOWED_DOCUMENTS)
 */
router.post("/upload", upload.any(), async (req, res) => {
  console.log("req.body",req.body);
  try {
    const { studentId, name } = req.body;
    const file = req.files && req.files[0];

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required.",
      });
    }

    if (!name || !ALLOWED_DOCUMENTS.includes(name)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing document name. Allowed values: ${ALLOWED_DOCUMENTS.join(", ")}`,
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded. Please upload a file via multipart/form-data.",
      });
    }

    // Verify if student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Check if document already exists and re-upload is disallowed by admin
    if (name === "studentPhoto") {
      if (student.image && !student.allowStudentPhotoReupload) {
        return res.status(403).json({
          success: false,
          message: "Profile photo re-upload is locked. Please contact the administrator to allow re-upload."
        });
      }
    } else {
      const fieldName = `allow${name.charAt(0).toUpperCase() + name.slice(1)}Reupload`;
      const isAlreadyUploaded = student[name] && student[name].url;
      if (isAlreadyUploaded && !student[fieldName]) {
        return res.status(403).json({
          success: false,
          message: "Document re-upload is locked. Please contact the administrator to allow re-upload."
        });
      }
    }

    console.log(`[Document Upload] Uploading '${name}' for Student: ${student.name} (${studentId})`);

    const uploadResult = await uploadToDocumentsCloudinary(file.buffer, name);

    if (name === "studentPhoto") {
      // Update image field directly
      student.image = uploadResult.secure_url;
      // Auto-lock after successful upload
      student.allowStudentPhotoReupload = false;
    } else {
      // Assign the subdocument properties directly to the fixed field
      student[name] = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };
      // Auto-lock after successful upload
      const fieldName = `allow${name.charAt(0).toUpperCase() + name.slice(1)}Reupload`;
      student[fieldName] = false;
    }

    await student.save();

    console.log(`[Document Upload] Document '${name}' successfully saved to user ID: ${student._id}`);

    return res.status(200).json({
      success: true,
      message: `${name} uploaded successfully.`,
      studentPhoto: student.image || null,
      documents: buildDocumentsResponse(student),
      allowPhotoReupload: student.allowStudentPhotoReupload || false,
      allowDocumentReupload: (student.allowClass10MarksheetReupload || student.allowClass12MarksheetReupload || student.allowAadharCardReupload || student.allowFatherAadharCardReupload || student.allowMotherAadharCardReupload) || false,
    });
  } catch (error) {
    console.error("[Document Upload] Error uploading document:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document.",
      error: error.message || error,
    });
  }
});

/**
 * GET /api/mobile/documents/:studentId
 * Returns list of documents uploaded for a student.
 */
router.get("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId parameter is required.",
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      studentPhoto: student.image || null,
      documents: buildDocumentsResponse(student),
      allowPhotoReupload: student.allowStudentPhotoReupload || false,
      allowDocumentReupload: (student.allowClass10MarksheetReupload || student.allowClass12MarksheetReupload || student.allowAadharCardReupload || student.allowFatherAadharCardReupload || student.allowMotherAadharCardReupload) || false,
    });
  } catch (error) {
    console.error("[Document List] Error fetching documents:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch documents.",
      error: error.message || error,
    });
  }
});

module.exports = router;
