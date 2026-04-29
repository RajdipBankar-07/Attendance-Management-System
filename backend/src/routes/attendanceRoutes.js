const express = require('express');
const router = express.Router();
const { markAttendance, getStudentAttendance, updateAttendanceRecords, deleteAttendanceSession } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', authorize('Admin', 'Teacher'), markAttendance);
router.put('/session', authorize('Admin', 'Teacher'), updateAttendanceRecords);
router.delete('/session', authorize('Admin', 'Teacher'), deleteAttendanceSession);
router.get('/student', authorize('Student'), getStudentAttendance);

module.exports = router;
