const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const batchRoutes = require('./routes/batchRoutes');
const reportRoutes = require('./routes/reportRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const noteRoutes = require('./routes/noteRoutes');
const auditRoutes = require('./routes/auditRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/announcements', announcementRoutes);

// Basic route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Attendance Server API' });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Final error handling middleware
app.use(errorHandler);

module.exports = app;
