const express = require('express');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @route POST /api/auth/register
// create a user (admin can create in production)
router.post('/register', asyncHandler(async (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password) {
    res.status(400);
    throw new Error('Please provide name, username and password');
  }
  const exists = await User.findOne({ username });
  if (exists) {
    res.status(400);
    throw new Error('Username already taken');
  }
  const user = await User.create({ name, username, password, role: role || 'student' });
  res.status(201).json({
    id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    token: generateToken(user._id)
  });
}));

// @route POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
    console.log("Login attempt:", req.body);
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  res.json({
    id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    token: generateToken(user._id)
  });
}));

module.exports = router;
