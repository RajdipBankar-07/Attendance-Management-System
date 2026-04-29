const express = require('express');
const router = express.Router();
const { getAuditLogs, deleteAuditLog, restoreAuditLog } = require('../controllers/auditController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', authorize('Admin', 'Principal', 'Vice-Principal', 'Teacher'), getAuditLogs);
router.post('/restore/:id', authorize('Admin', 'Principal', 'Vice-Principal', 'Teacher'), restoreAuditLog);
router.delete('/:id', authorize('Admin', 'Principal', 'Vice-Principal', 'Teacher'), deleteAuditLog);

module.exports = router;
