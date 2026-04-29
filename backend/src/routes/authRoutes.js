const express = require('express');
const router = express.Router();
const { authUser, registerUser, getAvailableSubjects } = require('../controllers/authController');

router.post('/login', authUser);
router.post('/register', registerUser);
router.get('/subjects', getAvailableSubjects);

module.exports = router;
