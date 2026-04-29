const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Email address not found' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
       return res.status(401).json({ message: 'Password incorrect' });
    }

    if (user.status === 'Pending') {
      return res.status(401).json({ message: 'Account is pending admin approval' });
    }
    if (user.status === 'Blocked') {
      return res.status(401).json({ message: 'Account has been blocked by admin' });
    }

    user.lastLogin = new Date();
    await user.save();

    // Log the successful login
    await AuditLog.create({
      action: 'USER_LOGIN',
      details: {
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department
      },
      performedBy: user._id
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department,
      year: user.year,
      subject: user.subject,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user (Teacher/Student only)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { 
    name, email, password, role, 
    department, year, subject, 
    phone, studentPhone, parentPhone, 
    rollNumber, gender 
  } = req.body;

  try {
    if (!['Teacher', 'Student'].includes(role)) {
      return res.status(400).json({ message: 'Can only register as Teacher or Student' });
    }

    // Basic Validation
    if (!name || !email || !password || !department || !year || !gender) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Phone Validation (+91 + 10 digits)
    const phoneRegex = /^\+91\d{10}$/;
    
    if (role === 'Teacher' && phone && !phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Teacher phone must be +91 followed by 10 digits' });
    }

    if (role === 'Student') {
      if (!studentPhone || !parentPhone || !rollNumber) {
        return res.status(400).json({ message: 'Roll number and contact details are required for students' });
      }
      if (!phoneRegex.test(studentPhone)) {
        return res.status(400).json({ message: 'Student phone must be +91 followed by 10 digits' });
      }
      if (!phoneRegex.test(parentPhone)) {
        return res.status(400).json({ message: 'Parent phone must be +91 followed by 10 digits' });
      }
      if (studentPhone === parentPhone) {
        return res.status(400).json({ message: 'Student and Parent phone numbers must be different' });
      }
    }

    // Uniqueness Checks
    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(400).json({ message: 'Email is already registered' });

    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) return res.status(400).json({ message: 'Phone number is already registered' });
    }

    if (studentPhone) {
      const sPhoneExists = await User.findOne({ studentPhone });
      if (sPhoneExists) return res.status(400).json({ message: 'Student phone number is already registered' });
    }

    // Complex Compound Uniqueness for Students (RollNo + Year + Dept)
    if (role === 'Student') {
      const duplicateStudent = await User.findOne({
        rollNumber,
        year: { $in: Array.isArray(year) ? year : [year] },
        department: { $in: Array.isArray(department) ? department : [department] }
      });
      if (duplicateStudent) {
        return res.status(400).json({ message: `Roll Number ${rollNumber} is already taken in this Department/Year` });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department: Array.isArray(department) ? department : [department],
      year: Array.isArray(year) ? year : [year],
      subject: Array.isArray(subject) ? subject : (subject ? [subject] : []),
      phone,
      studentPhone,
      parentPhone,
      rollNumber,
      gender,
      status: 'Pending', // Set to pending for admin notification testing
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        message: 'Registration successful!',
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available subjects based on dept and year
// @route   GET /api/auth/subjects
// @access  Public
const getAvailableSubjects = async (req, res) => {
  const { department, year } = req.query;

  try {
    // Find teachers who teach in this dept and year
    const teachers = await User.find({
      role: 'Teacher',
      department: { $in: [department] },
      year: { $in: [year] }
    }).select('subject');

    // Extract unique subjects
    const subjects = [...new Set(teachers.flatMap(t => t.subject))];
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { authUser, registerUser, getAvailableSubjects };
