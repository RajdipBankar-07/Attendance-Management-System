const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user status (Approve, Reject, Block, Unblock)
// @route   PUT /api/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
  const { status } = req.body; // 'Pending', 'Approved', 'Blocked'
  
  try {
    if (!['Pending', 'Approved', 'Blocked'].includes(status)) {
       return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);

    if (user) {
      user.status = status;
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change user password
// @route   PUT /api/users/:id/password
// @access  Private/Admin
const changeUserPassword = async (req, res) => {
  const { password } = req.body;

  try {
    if (!password || password.length < 6) {
       return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);

    if (user) {
      user.password = password; // Will be hashed via pre-save middleware
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Provision Admin or HOD user (Admin only)
// @route   POST /api/users/provision
// @access  Private/Admin
const provisionUser = async (req, res) => {
  const { name, email, password, role, department, gender } = req.body;

  try {
    if (!name || !email || !password || !gender || !role) {
      return res.status(400).json({ message: 'Missing core required fields' });
    }

    if (!['HOD', 'Admin'].includes(role)) {
      return res.status(400).json({ message: 'You can only provision HODs or Admins' });
    }

    if (role === 'HOD' && !department) {
      return res.status(400).json({ message: 'Target Domain (Department) is required for HODs' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (role === 'HOD') {
      const hodExists = await User.findOne({ role: 'HOD', department });
      if (hodExists) {
        return res.status(400).json({ message: 'An HOD for this department already exists' });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department: role === 'HOD' ? department : undefined,
      gender,
      status: 'Approved', // Admin created is auto-approved
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      gender: user.gender,
      status: user.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user details (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name !== undefined ? req.body.name : user.name;
      user.email = req.body.email !== undefined ? req.body.email : user.email;
      if (req.body.department !== undefined) {
          user.department = req.body.department;
          user.markModified('department');
      }
      if (req.body.year !== undefined) {
          user.year = req.body.year;
          user.markModified('year');
      }
      if (req.body.subject !== undefined) {
          user.subject = req.body.subject;
          user.markModified('subject');
      }
      user.gender = req.body.gender !== undefined ? req.body.gender : user.gender;
      user.role = req.body.role !== undefined ? req.body.role : user.role;
      user.phone = req.body.phone !== undefined ? (req.body.phone === "" ? undefined : req.body.phone) : user.phone;
      user.studentPhone = req.body.studentPhone !== undefined ? (req.body.studentPhone === "" ? undefined : req.body.studentPhone) : user.studentPhone;
      user.parentPhone = req.body.parentPhone !== undefined ? (req.body.parentPhone === "" ? undefined : req.body.parentPhone) : user.parentPhone;
      
      if (req.body.password && req.body.password.trim() !== "") {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        year: updatedUser.year,
        subject: updatedUser.subject,
        gender: updatedUser.gender,
        status: updatedUser.status,
        phone: updatedUser.phone,
        studentPhone: updatedUser.studentPhone,
        parentPhone: updatedUser.parentPhone,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await User.deleteOne({ _id: req.params.id });
      res.json({ message: 'User removed successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students by department and year
// @route   GET /api/users/students-by-class
// @access  Private/Teacher,Admin
const getStudentsByClass = async (req, res) => {
  const { department, year, subject } = req.query;

  try {
    const filter = {
      role: 'Student',
      status: 'Approved'
    };

    if (department) filter.department = department;
    if (year) filter.year = year;
    if (subject) filter.subject = subject;

    const students = await User.find(filter).select('name email rollNumber');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/users/stats
// @access  Private/Admin,Principal
const getDashboardStats = async (req, res) => {
  try {
    const roles = ['Admin', 'Principal', 'Vice-Principal', 'HOD', 'Teacher', 'Student'];
    const stats = {};
    
    // Get counts for each role
    for (const role of roles) {
      stats[role] = await User.countDocuments({ role });
    }
    
    stats.total = await User.countDocuments({});
    stats.pending = await User.countDocuments({ status: 'Pending' });
    
    // Get department distribution (Student only)
    const deptStats = await User.aggregate([
      { $match: { role: 'Student' } },
      { $unwind: '$department' },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);
    stats.departments = deptStats;

    // Get year distribution (Student only)
    const yearStats = await User.aggregate([
      { $match: { role: 'Student' } },
      { $unwind: '$year' },
      { $group: { _id: '$year', count: { $sum: 1 } } }
    ]);
    stats.years = yearStats;

    // Count course offerings
    const subjectStats = await User.aggregate([
      { $unwind: '$subject' },
      { $group: { _id: '$subject' } },
      { $count: 'total' }
    ]);
    stats.courseOfferings = subjectStats[0]?.total || 0;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  updateUserStatus,
  changeUserPassword,
  updateUser,
  deleteUser,
  provisionUser,
  getStudentsByClass,
  getDashboardStats,
  getProfile
};
