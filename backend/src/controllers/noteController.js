const Note = require('../models/Note');

// @desc    Get all notes for a teacher
// @route   GET /api/notes
// @access  Private/Teacher
const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ teacher: req.user._id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new note
// @route   POST /api/notes
// @access  Private/Teacher
const createNote = async (req, res) => {
  try {
    const { title, content, category, importance } = req.body;
    const note = await Note.create({
      teacher: req.user._id,
      title,
      content,
      category,
      importance
    });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private/Teacher
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check ownership
    if (note.teacher.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to delete this note' });
    }

    await note.deleteOne();
    res.json({ message: 'Note removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotes,
  createNote,
  deleteNote
};
