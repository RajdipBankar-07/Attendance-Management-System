const express = require('express');
const router = express.Router();
const { 
  createBatch, 
  getBatches, 
  updateBatch,
  deleteBatch,
  addStudentToBatch, 
  removeStudentFromBatch 
} = require('../controllers/batchController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All batch routes here are protected and require Admin role for now
// Make getBatches available to Teachers as well
router.use(protect);

router.route('/')
  .get(authorize('Admin', 'Teacher'), getBatches)
  .post(authorize('Admin'), createBatch);

router.route('/:id')
  .put(authorize('Admin'), updateBatch)
  .delete(authorize('Admin'), deleteBatch);

router.route('/:id/students')
  .post(authorize('Admin'), addStudentToBatch);

router.route('/:id/students/:studentId')
  .delete(authorize('Admin'), removeStudentFromBatch);

module.exports = router;
