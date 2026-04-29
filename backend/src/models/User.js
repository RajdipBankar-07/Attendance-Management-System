const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Principal', 'Vice-Principal', 'HOD', 'Teacher', 'Student'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Blocked'],
    default: 'Pending',
  },
  department: [String],
  year: [String],
  subject: [String],
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  studentPhone: {
    type: String,
    unique: true,
    sparse: true
  },
  parentPhone: {
    type: String,
    sparse: true
  },
  rollNumber: String,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  lastLogin: {
    type: Date,
  }
}, {
  timestamps: true,
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Enforce one HOD per department
userSchema.index({ department: 1 }, { 
  unique: true, 
  partialFilterExpression: { role: 'HOD' } 
});

const User = mongoose.model('User', userSchema);
module.exports = User;
