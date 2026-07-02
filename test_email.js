require('dotenv').config();
const { sendForceHireOtpEmail } = require('./utils/mailer');
sendForceHireOtpEmail('techteam.garudclasses@gmail.com', 'Test Candidate', '123456')
  .then(() => console.log('Email sent successfully'))
  .catch(err => console.error('Error:', err.message));
