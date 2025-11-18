const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('./config/cloudinary');
const { Readable } = require('stream');


const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez jpg, png, gif ou webp'));
    }
  }
});

// POST /api/upload/cover - Upload image to Cloudinary
router.post('/cover', upload.single('cover'), async (req, res) => {
  try {
    console.log('Upload request received');
    
    if (!req.file) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Aucun fichier uploadé' 
      });
    }

    console.log('File:', req.file.originalname, '-', req.file.size, 'bytes');

    
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    // Upload to Cloudinary a pic
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'mezame/covers',
          resource_type: 'image',
          transformation: [
            { width: 500, height: 700, crop: 'fill', gravity: 'auto' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary error:', error);
            reject(error);
          } else {
            console.log('Upload success:', result.public_id);
            resolve(result);
          }
        }
      );

      bufferStream.pipe(uploadStream);
    });

    const result = await uploadPromise;

    res.json({
      ok: true,
      message: 'Image upload successful',
      url: result.secure_url,
      public_id: result.public_id,
      thumbnail_url: cloudinary.url(result.public_id, {
        width: 200,
        height: 280,
        crop: 'fill'
      })
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message || 'Erreur lors de l\'upload' 
    });
  }
});

// DELETE /api/upload/cover/:public_id - delete an image of Cloudinary
router.delete('/cover', async (req, res) => {
  try {
    const { public_id } = req.body;
    
    if (!public_id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'public_id requis' 
      });
    }

    console.log('🗑️ Deleting:', public_id);

    const result = await cloudinary.uploader.destroy(public_id);
    
    if (result.result === 'ok') {
      console.log('Image deleted');
      res.json({ ok: true, message: 'Image deleted' });
    } else {
      console.log('⚠️ Image not found');
      res.status(404).json({ 
        ok: false, 
        error: 'Image not found' 
      });
    }
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).json({ 
      ok: false, 
      error: err.message 
    });
  }
});

module.exports = router;