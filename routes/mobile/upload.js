const express = require("express");
const router = express.Router();
const multer = require("multer");
const { cloudinary, documentsConfig } = require("../../config/documentsCloudinary");

// Setup multer memory storage to hold the file buffer in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

/**
 * Uploads a buffer to Cloudinary using the specific configuration for documents.
 * @param {Buffer} fileBuffer - The file buffer.
 * @param {string} originalName - The original name of the file.
 * @returns {Promise<object>} Cloudinary upload result.
 */
const uploadToDocumentsCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "mobile_uploads",
        resource_type: "auto", // Automatically detect image, video, raw file, etc.
        ...documentsConfig, // Apply documents Cloudinary credentials
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
 * POST /api/mobile/upload
 * Expects a multipart form upload.
 * Can accept file in any field name (e.g., 'image', 'file', 'photo').
 */
router.post("/", upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files[0];
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded. Please upload a file via multipart/form-data.",
      });
    }

    console.log(`[Mobile Upload] Uploading file '${file.originalname}' (${file.size} bytes) to documents Cloudinary.`);

    const uploadResult = await uploadToDocumentsCloudinary(file.buffer, file.originalname);

    console.log(`[Mobile Upload] Upload success. Public ID: ${uploadResult.public_id}, URL: ${uploadResult.secure_url}`);

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully to documents Cloudinary cloud.",
      acknowledgement: {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        url: uploadResult.url,
        resource_type: uploadResult.resource_type,
        created_at: uploadResult.created_at,
        bytes: uploadResult.bytes,
        format: uploadResult.format,
      },
      cloudinary_response: uploadResult,
    });
  } catch (error) {
    console.error("[Mobile Upload] Error uploading to documents Cloudinary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload image to documents Cloudinary.",
      error: error.message || error,
    });
  }
});

module.exports = router;
