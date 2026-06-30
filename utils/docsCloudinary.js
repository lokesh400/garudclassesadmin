const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configure with Documents Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.DOCUMNETS_CLOUDINARY_CLOUD_NAME, // Note: env has typo "DOCUMNETS"
  api_key: process.env.DOCUMENTS_CLOUDINARY_API_KEY,
  api_secret: process.env.DOCUMENTS_CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer to the Documents Cloudinary cloud.
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} folder - Cloudinary folder path (e.g. "onboarding/aadhaar")
 * @param {string} resourceType - 'image' | 'raw' | 'auto'
 * @returns {Promise<{url: string, publicId: string}>}
 */
function uploadToDocsCloud(buffer, folder = "onboarding", resourceType = "auto") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

/**
 * Delete a file from Documents Cloudinary by public ID.
 * @param {string} publicId
 * @param {string} resourceType
 */
function deleteFromDocsCloud(publicId, resourceType = "auto") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadToDocsCloud, deleteFromDocsCloud };
