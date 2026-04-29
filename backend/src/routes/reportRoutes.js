const express = require('express');
const router = express.Router();
const { getAttendanceReports, getAttendanceStats, downloadAttendanceCSV, downloadAttendancePDF, getStudentAnalytics, getTeacherAnalyticsTimeSeries, getFiltersMetadata } = require('../controllers/reportController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
// Accessible by Admin, Principal, Vice-Principal, HOD, and Teacher
router.use(authorize('Admin', 'Principal', 'Vice-Principal', 'HOD', 'Teacher'));

router.get('/attendance', getAttendanceReports);
router.get('/filters-metadata', getFiltersMetadata);
router.get('/attendance/csv', downloadAttendanceCSV);
router.get('/attendance/pdf', downloadAttendancePDF);
router.get('/analytics', getStudentAnalytics);
router.get('/teacher-analytics', getTeacherAnalyticsTimeSeries);
router.get('/stats', getAttendanceStats);

module.exports = router;
