const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: false
  },
  department: String,
  year: String,
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  sessionType: {
    type: String,
    enum: ['Lecture', 'Practical'],
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    required: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  editedAt: {
    type: Date
  },
  previousStatus: {
    type: String
  }
}, {
  timestamps: true
});

// Adjust unique index: department/year/subject/date/time/student covers lectures
attendanceSchema.index({ student: 1, date: 1, time: 1, batch: 1, subject: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
