const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String, // 'DELETE_ATTENDANCE'
    required: true
  },
  details: {
    type: Object, // Specific info about the session
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
