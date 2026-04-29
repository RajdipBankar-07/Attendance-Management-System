const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');

// @desc    Mark attendance for a batch
// @route   POST /api/attendance
// @access  Private/Teacher
const markAttendance = async (req, res) => {
  const { batchId, date, time, sessionType, records, subject, department, year } = req.body;

  try {
    let finalSubject = subject;
    let finalDept = department;
    let finalYear = year;

    if (batchId) {
      const batch = await Batch.findById(batchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }

      if (batch.teacher.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not authorized for this batch' });
      }
      finalSubject = batch.subject;
      finalDept = batch.department;
      finalYear = batch.year;
    } else {
      // Lecture mode: Validate incoming class fields
      if (!subject || !department) {
         return res.status(400).json({ message: 'Subject and Department are required for Lecture mode' });
      }
      finalDept = department; // Priority to manually selected dept
    }

    // Ensure double-check teacher profile if dept is still missing
    if (!finalDept && req.user.department && req.user.department.length > 0) {
      finalDept = req.user.department[0];
    }

    // Prepare bulk docs
    const attendanceDocs = records.map(r => ({
      student: r.student,
      subject: finalSubject,
      teacher: req.user._id,
      batch: batchId || null,
      department: finalDept,
      year: finalYear,
      date: new Date(date),
      time,
      sessionType,
      status: r.status
    }));

    await Attendance.insertMany(attendanceDocs, { ordered: false });
    res.status(201).json({ message: 'Attendance marked successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already recorded for some or all students in this session.' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student's own attendance
// @route   GET /api/attendance/student
// @access  Private/Student
const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Find all attendance documents for this exact student directly directly via the root 'student' key
    const attendanceRecords = await Attendance.find({ student: studentId })
      .populate('batch', 'batchName department year')
      .populate('teacher', 'name email');

    // Munge the data into a simpler format for the frontend
    const report = attendanceRecords.map(session => ({
        date: session.date,
        time: session.time,
        sessionType: session.sessionType,
        status: session.status,
        batchName: session.batch?.batchName,
        subject: session.subject,
        department: session.department || session.batch?.department || 'N/A',
        teacherName: session.teacher?.name
    }));

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update attendance records for a session
// @route   PUT /api/attendance/session
// @access  Private/Teacher,Admin
const updateAttendanceRecords = async (req, res) => {
  const { batchId, date, time, sessionType, records } = req.body;

  try {
    // Check if future date
    if (new Date(date) > new Date()) {
      return res.status(400).json({ message: 'Cannot edit future attendance' });
    }

    // Process each student record update
    const updatePromises = records.map(async (record) => {
      const existing = await Attendance.findOne({
        student: record.student,
        batch: batchId,
        date: new Date(date),
        time,
        sessionType
      });

      if (existing) {
        // Validation: Must be the teacher who took it or Admin
        if (existing.teacher.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
           throw new Error(`Not authorized to edit attendance for student ${record.student}`);
        }

        // Only update if status changed
        if (existing.status !== record.status) {
          existing.previousStatus = existing.status;
          existing.status = record.status;
          existing.isEdited = true;
          existing.editedBy = req.user._id;
          existing.editedAt = new Date();
          return existing.save();
        }
      }
      return null;
    });

    await Promise.all(updatePromises);
    res.json({ message: 'Attendance records updated successfully' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an entire attendance session
// @route   DELETE /api/attendance/session
// @access  Private/Admin,Teacher
const deleteAttendanceSession = async (req, res) => {
  const { batchId, date, time, sessionType, subject } = req.body;

  try {
    const filter = {
      date: new Date(date),
      time,
      sessionType
    };
    if (batchId) filter.batch = batchId;
    if (subject) filter.subject = subject;

    const recordsToDelete = await Attendance.find(filter);
    if (recordsToDelete.length === 0) {
      return res.status(404).json({ message: 'No records found for this session' });
    }

    if (recordsToDelete[0].teacher.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete this session' });
    }

    // Capture FULL records for restoration backup
    const sessionDetails = {
      subject: recordsToDelete[0].subject,
      batch: recordsToDelete[0].batch,
      date: recordsToDelete[0].date,
      time: recordsToDelete[0].time,
      type: recordsToDelete[0].sessionType,
      teacher: recordsToDelete[0].teacher,
      department: recordsToDelete[0].department,
      year: recordsToDelete[0].year,
      recordCount: recordsToDelete.length,
      fullRecords: recordsToDelete.map(r => ({
        student: r.student,
        status: r.status,
        previousStatus: r.previousStatus,
        isEdited: r.isEdited
      }))
    };

    await Attendance.deleteMany(filter);

    await AuditLog.create({
      action: 'DELETE_ATTENDANCE',
      details: sessionDetails,
      performedBy: req.user._id
    });

    res.json({ message: 'Attendance session deleted and logged successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  markAttendance,
  getStudentAttendance,
  updateAttendanceRecords,
  deleteAttendanceSession
};
