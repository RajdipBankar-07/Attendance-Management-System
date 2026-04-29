const Announcement = require('../models/Announcement');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const createAnnouncement = async (req, res) => {
  try {
    let { title, message, targetRole, targetUser } = req.body;
    
    // If targetUser string (email) is provided instead of ID, resolve it
    if (targetUser && typeof targetUser === 'string' && !targetUser.match(/^[0-9a-fA-F]{24}$/)) {
        // Case-insensitive email lookup
        const u = await User.findOne({ email: new RegExp(`^${targetUser.trim()}$`, 'i') });
        if (u) {
           targetUser = u._id;
           // If we matched a specific user, we force targetRole to 'Specific' 
           // to avoid confusing 'All' logic if frontend didn't set it.
           if (!targetRole || targetRole === 'All') targetRole = 'Specific';
        } else {
           return res.status(400).json({ message: `User with email ${targetUser} not found` });
        }
    } else if (!targetUser || targetUser === "") {
        targetUser = null;
    }

    const announcement = await Announcement.create({
      title,
      message,
      targetRole: targetRole || 'All',
      targetUser,
      createdBy: req.user._id
    });

    // Logging the broadcast event
    await AuditLog.create({
      action: 'BROADCAST_MESSAGE',
      details: { title, targetRole, targetUserEmail: targetUser ? (await User.findById(targetUser)).email : 'All' },
      performedBy: req.user._id
    });

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAnnouncements = async (req, res) => {
  try {
     let query = {};
     // Admin sees all. Others see their specific targets.
     if (req.user.role !== 'Admin') {
         query = {
             $or: [
                 { targetRole: 'All' },
                 { targetRole: req.user.role },
                 { targetUser: req.user._id },
                 { createdBy: req.user._id }
             ],
             hiddenBy: { $ne: req.user._id } // ← Filter out dismissed messages
         };
     }
     const announcements = await Announcement.find(query)
        .populate('createdBy', 'name role')
        .populate('targetUser', 'name email')
        .sort({ createdAt: -1 });
     
     res.json(announcements);
  } catch (error) {
     res.status(500).json({ message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
     const ann = await Announcement.findById(req.params.id);
     if (!ann) return res.status(404).json({ message: 'Not found' });
     
     const isCreator = ann.createdBy.toString() === req.user._id.toString();
     const isAdmin   = req.user.role === 'Admin' || req.user.role === 'Principal' || req.user.role === 'Vice-Principal';

     // Scenario A: Retract (Delete for everyone) -> Only if Creator or Admin
     if (isCreator || isAdmin) {
         await Announcement.deleteOne({ _id: req.params.id });

         // Log retraction
         await AuditLog.create({
           action: 'RETRACT_MESSAGE',
           details: { title: ann.title, reason: 'Manual Retraction' },
           performedBy: req.user._id
         });

         return res.json({ message: 'Broadcast retracted successfully for everyone' });
     } 
     
     // Scenario B: Hide/Dismiss (Inbox cleaning for recipients)
     await Announcement.findByIdAndUpdate(req.params.id, {
         $addToSet: { hiddenBy: req.user._id }
     });
     
     res.json({ message: 'Message dismissed from your view' });

  } catch (error) {
     res.status(500).json({ message: error.message });
  }
};

module.exports = { createAnnouncement, getAnnouncements, deleteAnnouncement };
