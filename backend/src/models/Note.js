const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Task', 'Reminder', 'Student Note', 'General'],
    default: 'General'
  },
  importance: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  }
}, {
  timestamps: true
});

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
