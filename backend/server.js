const express = require('express');
const app = express();
const dotenv = require('dotenv').config();
const PORT = process.env.PORT || 3000;
const db = require('./config/db')
app.use(express.json())

app.use('/user',require('./routers/user'))
app.use('/company',require('./routers/Company'))

app.listen(PORT, () => {
  db();
  console.log(`Server is running on port ${PORT}`);
});

