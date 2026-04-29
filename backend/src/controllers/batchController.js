const Batch = require('../models/Batch');
const User = require('../models/User');

// @desc    Create a new batch
// @route   POST /api/batches
// @access  Private/Admin
const createBatch = async (req, res) => {
  const { department, year, subject, batchName, teacherId, initialStudents } = req.body;

  try {
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'Teacher') {
      return res.status(400).json({ message: 'Invalid teacher selected' });
    }

    // Case-insensitive check to prevent duplicate batch designations (e.g. T1 vs t1)
    const batchExists = await Batch.findOne({ 
      department, 
      year, 
      subject: { $regex: new RegExp(`^${subject.trim()}$`, "i") }, 
      batchName: { $regex: new RegExp(`^${batchName.trim()}$`, "i") } 
    });

    if (batchExists) {
      return res.status(400).json({ 
        message: `A batch named "${batchName}" already exists for this subject/track.` 
      });
    }

    // New Protection: Ensure students aren't double-enrolled for the same subject
    if (initialStudents && initialStudents.length > 0) {
      const duplicateStudent = await Batch.findOne({
        subject: { $regex: new RegExp(`^${subject.trim()}$`, "i") },
        students: { $in: initialStudents }
      });
      if (duplicateStudent) {
        return res.status(400).json({ 
          message: `Some selected students are already enrolled in batch "${duplicateStudent.batchName}" for this subject.` 
        });
      }
    }

    const batch = await Batch.create({
      department,
      year,
      subject,
      batchName,
      teacher: teacherId,
      students: initialStudents || []
    });

    res.status(201).json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a batch
// @route   PUT /api/batches/:id
// @access  Private/Admin
const updateBatch = async (req, res) => {
  const { department, year, subject, batchName } = req.body;

  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    // Validate uniqueness if track info is changed
    if (department || year || subject || batchName) {
      const checkDept = department || batch.department;
      const checkYear = year || batch.year;
      const checkSub = subject || batch.subject;
      const checkName = batchName || batch.batchName;

      const duplicate = await Batch.findOne({
        _id: { $ne: req.params.id },
        department: checkDept,
        year: checkYear,
        subject: { $regex: new RegExp(`^${checkSub.trim()}$`, "i") },
        batchName: { $regex: new RegExp(`^${checkName.trim()}$`, "i") }
      });

      if (duplicate) {
        return res.status(400).json({ message: 'Error: This batch configuration already exists.' });
      }
    }

    const updated = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('teacher', 'name email')
      .populate('students', 'name email rollNumber');
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a batch
// @route   DELETE /api/batches/:id
// @access  Private/Admin
const deleteBatch = async (req, res) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);
    res.json({ message: 'Batch successfully removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all batches
// @route   GET /api/batches
// @access  Private/Admin,Teacher
const getBatches = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Teacher') {
      query = { teacher: req.user._id };
    }

    const batches = await Batch.find(query)
      .populate('teacher', 'name email')
      .populate('students', 'name email');
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add student to batch
// @route   POST /api/batches/:id/students
// @access  Private/Admin
const addStudentToBatch = async (req, res) => {
  const { studentId } = req.body;
  const batchId = req.params.id;

  try {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'Student') {
      return res.status(400).json({ message: 'Invalid student selected' });
    }

    // Rule: Student -> only one batch per subject
    // Check if student is already in another batch for the same subject
    const existingSubjectBatch = await Batch.findOne({
      subject: batch.subject,
      students: studentId
    });

    if (existingSubjectBatch) {
      if (existingSubjectBatch._id.toString() === batchId) {
        return res.status(400).json({ message: 'Student already in this batch' });
      }
      return res.status(400).json({ 
        message: `Student already assigned to ${existingSubjectBatch.batchName} for this subject` 
      });
    }

    batch.students.push(studentId);
    await batch.save();
    
    // Return updated batch
    const updatedBatch = await Batch.findById(batchId)
      .populate('teacher', 'name email')
      .populate('students', 'name email');

    res.json(updatedBatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove student from batch
// @route   DELETE /api/batches/:id/students/:studentId
// @access  Private/Admin
const removeStudentFromBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    batch.students = batch.students.filter(
      (s) => s.toString() !== req.params.studentId
    );
    await batch.save();

    res.json({ message: 'Student removed from batch' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBatch,
  getBatches,
  updateBatch,
  deleteBatch,
  addStudentToBatch,
  removeStudentFromBatch
};
