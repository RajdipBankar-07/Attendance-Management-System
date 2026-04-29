const AuditLog = require('../models/AuditLog');
const Attendance = require('../models/Attendance');

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private/Admin,Teacher
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email')
      .sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an audit log
// @route   DELETE /api/audit/:id
// @access  Private/Admin
const deleteAuditLog = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }
    await log.deleteOne();
    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Restore a deleted attendance session
// @route   POST /api/audit/restore/:id
// @access  Private/Admin
const restoreAuditLog = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log || log.action !== 'DELETE_ATTENDANCE') {
      return res.status(404).json({ message: 'Valid deletion log not found' });
    }

    const { details } = log;
    
    // Check if records already exist for this time/date (prevent duplicates)
    const existing = await Attendance.findOne({
      date: new Date(details.date),
      time: details.time,
      sessionType: details.type
    });

    if (existing) {
      return res.status(400).json({ message: 'Attendance already exists for this date/time. Restore blocked.' });
    }

    // Re-create records
    const restoreDocs = details.fullRecords.map(r => ({
      student: r.student,
      subject: details.subject,
      teacher: details.teacher,
      batch: details.batch,
      department: details.department,
      year: details.year,
      date: new Date(details.date),
      time: details.time,
      sessionType: details.type,
      status: r.status,
      previousStatus: r.previousStatus,
      isEdited: r.isEdited
    }));

    await Attendance.insertMany(restoreDocs);

    // Delete the log after successful restoration
    await log.deleteOne();

    res.json({ message: 'Session restored successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAuditLogs, deleteAuditLog, restoreAuditLog };
