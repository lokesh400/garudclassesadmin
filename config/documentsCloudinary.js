const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
dotenv.config();

const documentsConfig = {
  cloud_name: process.env.DOCUMNETS_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.DOCUMENTS_CLOUDINARY_API_KEY,
  api_secret: process.env.DOCUMENTS_CLOUDINARY_API_SECRET,
  secure: true,
};

module.exports = {
  cloudinary,
  documentsConfig,
};
