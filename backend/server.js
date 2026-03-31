const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const dotenv = require('dotenv').config();
const PORT = process.env.PORT || 3000;
const db = require('./config/db');

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}));

app.use('/api/users', require('./routers/user'));
app.use('/api/companies', require('./routers/Company'));
app.use('/api/clients', require('./routers/client'));
app.use('/api/invoices', require('./routers/invoice'));
app.use('/api/invoice-lines', require('./routers/invoiceLine'));
app.use('/api/payments', require('./routers/payment'));
app.use('/api/products', require('./routers/product'));
app.use('/api/expenses', require('./routers/expense'));
app.use('/api/reminders', require('./routers/reminder'));
app.use('/api/payment-gateways', require('./routers/paymentGateway'));
app.use('/api/interactions', require('./routers/interaction'));
app.use('/api/audit-logs', require('./routers/auditLog'));
app.use('/api/cash-transactions', require('./routers/cashTransaction'));
app.use('/api/settings', require('./routers/settings'));
app.use('/api/notifications', require('./routers/notification'));
app.use('/api/budgets', require('./routers/budget'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  db();
  console.log(`Server is running on port ${PORT}`);
});
