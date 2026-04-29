const express = require('express');
const router = express.Router();
const { createAnnouncement, getAnnouncements, deleteAnnouncement } = require('../controllers/announcementController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

// Everyone can view their respective announcements
router.get('/', getAnnouncements);

// Only admins and designated leadership can broadcast announcements
router.post('/', authorize('Admin', 'Principal', 'Vice-Principal', 'HOD'), createAnnouncement);
router.delete('/:id', authorize('Admin', 'Principal', 'Vice-Principal', 'HOD'), deleteAnnouncement);

module.exports = router;
