const express = require('express');
const cors = require('cors');
const app = express();
const dotenv = require('dotenv').config();
const PORT = process.env.PORT || 3000;
const db = require('./config/db');

app.use(cors());
app.use(express.json());

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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  db();
  console.log(`Server is running on port ${PORT}`);
});
