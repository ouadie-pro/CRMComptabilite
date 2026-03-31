const express = require('express');
const Router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../controllers/User');
const {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkApproveExpenses,
  bulkRejectExpenses
} = require('../controllers/Expense');

const uploadDir = path.join(__dirname, '../uploads/expenses');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `expense-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    cb(new Error('Seuls les fichiers images (JPEG, PNG), PDF et documents sont autorisés'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

Router.use(authMiddleware);

Router.get('/', getAllExpenses);
Router.get('/:id', getExpenseById);
Router.post('/', createExpense);
Router.put('/:id', updateExpense);
Router.delete('/:id', deleteExpense);
Router.post('/bulk-approve', bulkApproveExpenses);
Router.post('/bulk-reject', bulkRejectExpenses);

Router.post('/upload/:id', upload.single('receipt'), async (req, res) => {
  try {
    const Expense = require('../models/ExpenseSchema');
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }
    const attachmentUrl = `/uploads/expenses/${req.file.filename}`;
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { attachmentUrl },
      { new: true }
    );
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ success: true, attachmentUrl, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = Router;
