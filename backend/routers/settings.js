const express = require('express');
const Router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getSettings,
  updateSettings,
  testSmtp,
  uploadLogo,
} = require('../controllers/Settings');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers images (JPEG, JPG, PNG, WEBP) sont autorisés'));
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

Router.get('/', getSettings);
Router.put('/', updateSettings);
Router.post('/test-smtp', testSmtp);
Router.post('/logo', upload.single('logo'), uploadLogo);

module.exports = Router;
