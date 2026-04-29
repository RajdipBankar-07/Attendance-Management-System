const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  updateUserStatus, 
  changeUserPassword, 
  provisionUser,
  updateUser,
  deleteUser,
  getStudentsByClass,
  getDashboardStats,
  getProfile
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All routes here are protected
router.use(protect);
router.get('/profile', getProfile);
router.get('/students-by-class', authorize('Admin', 'Teacher'), getStudentsByClass);

router.use(authorize('Admin', 'Principal', 'Vice-Principal'));
router.get('/stats', getDashboardStats);
router.get('/', getUsers);
router.post('/provision', authorize('Admin'), provisionUser);
router.route('/:id')
  .put(updateUser)
  .delete(authorize('Admin'), deleteUser); // Keep deletion Admin-only

router.put('/:id/status', authorize('Admin'), updateUserStatus); // Keep status admin-only
router.put('/:id/password', authorize('Admin'), changeUserPassword); // Keep password admin-only

module.exports = router;
