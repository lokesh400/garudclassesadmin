const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const superadmin = await User.findOne({ role: 'superadmin' });
    console.log('Superadmin:', superadmin ? { username: superadmin.username, email: superadmin.email } : 'Not found');
    process.exit(0);
  });
