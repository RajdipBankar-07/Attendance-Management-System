const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  department: { type: String, required: true },
  year: { type: String, required: true },
  subject: { type: String, required: true },
  batchName: { type: String, required: true },
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  students: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, {
  timestamps: true,
});

const Batch = mongoose.model('Batch', batchSchema);
module.exports = Batch;
