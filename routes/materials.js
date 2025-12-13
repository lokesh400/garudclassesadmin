const express = require('express');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const cloudinary = require('../config/cloudinary.js');
const Material = require('../models/Material.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // we will stream buffer to cloudinary

// GET materials
router.get('/', protect, asyncHandler(async (req, res) => {
  const materials = await Material.find().sort({ createdAt: -1 });
  res.json(materials);
}));

// POST upload material (multipart/form-data) field 'file' + 'title'
router.post('/upload', protect, upload.single('file'), asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!req.file) {
    res.status(400);
    throw new Error('File is required');
  }

  // stream buffer to cloudinary (use upload_stream)
  const streamifier = await import('streamifier');
  const bufferStream = streamifier.createReadStream(req.file.buffer);

  const streamUpload = (bufferStream) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'garudone/materials' }, (error, result) => {
        if (result) resolve(result);
        else reject(error);
      });
      bufferStream.pipe(stream);
    });
  };

  const result = await streamUpload(bufferStream);
  const material = await Material.create({
    title,
    description,
    fileUrl: result.secure_url,
    publicId: result.public_id,
    uploadedBy: req.user._id
  });

  res.status(201).json(material);
}));

// DELETE material by :id
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const mat = await Material.findById(req.params.id);
  if (!mat) { res.status(404); throw new Error('Material not found'); }
  if (mat.publicId) {
    await cloudinary.uploader.destroy(mat.publicId);
  }
  await mat.remove();
  res.json({ message: 'Deleted' });
}));

module.exports = router;
