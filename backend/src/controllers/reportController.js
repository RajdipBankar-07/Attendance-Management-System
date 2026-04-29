const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');
const User = require('../models/User');
const { Parser } = require('json2csv');
const mongoose = require('mongoose');

// Helper function to build the attendance query
const buildAttendanceQuery = async (filters, user) => {
  const { department, subject, year, time, startDate, endDate, studentSearch, teacher, sessionType, batch } = filters;
  let attendanceQuery = {};

  // 1. Domain / Basic Filters (Apply first)
  if (sessionType) attendanceQuery.sessionType = sessionType;
  if (batch && mongoose.Types.ObjectId.isValid(batch)) {
    attendanceQuery.batch = new mongoose.Types.ObjectId(batch);
  }
  if (subject) attendanceQuery.subject = new RegExp(subject.trim(), 'i');
  if (year) attendanceQuery.year = new RegExp(year.trim(), 'i');
  if (time) attendanceQuery.time = new RegExp(time.trim(), 'i');

  // 2. Department Filtering Logic
  if (user.role === 'HOD') {
    // Force HOD to their department(s)
    const hodDepts = user.department || [];
    if (department) {
      // If they provided a filter, intersect it with their allowed depts
      attendanceQuery.$and = [
        { department: new RegExp(department.trim(), 'i') },
        { department: { $in: hodDepts } }
      ];
    } else {
      attendanceQuery.department = { $in: hodDepts };
    }
  } else if (department) {
    // Other roles can filter department freely
    attendanceQuery.department = new RegExp(department.trim(), 'i');
  }

  // 3. Role-based Teacher Restriction
  if (user.role === 'Teacher') {
    attendanceQuery.teacher = user._id; // already an ObjectId from Passport/Auth
  } else if (teacher && mongoose.Types.ObjectId.isValid(teacher)) {
    attendanceQuery.teacher = new mongoose.Types.ObjectId(teacher);
  }

  // 4. Date Range
  if (startDate || endDate) {
    attendanceQuery.date = {};
    if (startDate) attendanceQuery.date.$gte = new Date(startDate);
    if (endDate) attendanceQuery.date.$lte = new Date(endDate);
  }

  // 5. Student Search
  if (studentSearch) {
    const searchStr = studentSearch.trim();
    const User = require('../models/User'); // Ensure Model is loaded
    const matchedStudents = await User.find({
      role: 'Student',
      $or: [
        { name: new RegExp(searchStr, 'i') },
        { email: new RegExp(searchStr, 'i') },
        { rollNumber: new RegExp(searchStr, 'i') }
      ]
    }).select('_id');
    attendanceQuery.student = { $in: matchedStudents.map(s => s._id) };
  }

  return attendanceQuery;
};

// @desc    Get unique values for filters (Subjects, Years, Teachers, Departments)
// @route   GET /api/reports/filters-metadata
// @access  Private
const getFiltersMetadata = async (req, res) => {
  try {
    const user = req.user;
    const isHOD = user.role === 'HOD';
    const isManagement = ['Admin', 'Principal', 'Vice-Principal'].includes(user.role);

    // Read optional filter params sent from the dashboard
    const { department: deptFilter, year: yearFilter } = req.query;

    // Provide standard defaults to prevent empty dashboards before initial records are generated
    let subjects = new Set();
    let years = new Set(['F.Y', 'S.Y', 'T.Y', 'Final Year']);
    let teacherIds = new Set();
    let departments = new Set(isHOD ? user.department : ['CSE', 'IT', 'E&TC', 'MECH', 'CIVIL', 'AIDS']);

    const depts = user.department || [];
    const deptRegex = depts.map(d => new RegExp(d, 'i'));

    if (isHOD || isManagement) {
      // 1. Build base attendance query, scoped by HOD dept + optional year/dept filters
      const attendQuery = {};
      if (isHOD) {
        attendQuery.department = { $in: deptRegex };
      } else if (deptFilter) {
        attendQuery.department = new RegExp(deptFilter, 'i');
      }
      if (yearFilter) {
        attendQuery.year = new RegExp(yearFilter, 'i');
      }
      const [attSub, attYrs, attTechs, attDepts] = await Promise.all([
        Attendance.distinct('subject', attendQuery),
        Attendance.distinct('year', attendQuery),
        Attendance.distinct('teacher', attendQuery),
        Attendance.distinct('department', attendQuery)
      ]);
      attSub.forEach(s => subjects.add(s));
      attYrs.forEach(y => years.add(y));
      attTechs.forEach(t => teacherIds.add(t.toString()));
      attDepts.forEach(d => departments.add(d));

      // 2. Fallback to Batches (scoped by dept + year if provided)
      const batchQuery = {};
      if (isHOD) {
        batchQuery.department = { $in: deptRegex };
      } else if (deptFilter) {
        batchQuery.department = new RegExp(deptFilter, 'i');
      }
      if (yearFilter) {
        batchQuery.year = new RegExp(yearFilter, 'i');
      }
      const batches = await Batch.find(batchQuery);
      batches.forEach(b => {
        if (b.subject) subjects.add(b.subject);
        if (b.year) years.add(b.year);
        if (b.teacher) teacherIds.add(b.teacher.toString());
        if (b.department) departments.add(b.department);
      });

      // 3. Fallback to Teachers (scoped by dept; only add subject if teacher teaches selected year)
      const teacherQuery = { role: 'Teacher' };
      if (isHOD) {
        teacherQuery.department = { $in: deptRegex };
      } else if (deptFilter) {
        teacherQuery.department = new RegExp(deptFilter, 'i');
      }
      
      const deptTeachers = await User.find(teacherQuery, '_id name subject year department');
      
      deptTeachers.forEach(t => {
        teacherIds.add(t._id.toString());
        const teachesYear = !yearFilter || (Array.isArray(t.year) && t.year.some(y => new RegExp(yearFilter, 'i').test(y)));
        if (teachesYear) {
          if (Array.isArray(t.subject)) t.subject.forEach(s => subjects.add(s));
        }
        if (Array.isArray(t.year)) t.year.forEach(y => years.add(y));
        if (Array.isArray(t.department)) t.department.forEach(d => departments.add(d));
      });

    } else if (user.role === 'Teacher') {
      // Teachers only see their own subjects/years
      if (Array.isArray(user.subject)) user.subject.forEach(s => subjects.add(s));
      if (Array.isArray(user.year)) user.year.forEach(y => years.add(y));
      if (Array.isArray(user.department)) user.department.forEach(d => departments.add(d));
      teacherIds.add(user._id.toString());
    }

    const teachers = await User.find({ _id: { $in: Array.from(teacherIds) } }, 'name subject department year').sort({ name: 1 });

    // Fetch relevant students for the specific student filter dropdown
    const studentQuery = { role: 'Student', status: 'Approved' };
    if (isHOD) {
      studentQuery.department = { $in: deptRegex };
    } else if (user.role === 'Teacher') {
      const tDepts = user.department || [];
      if (tDepts.length > 0) {
        studentQuery.department = { $in: tDepts.map(d => new RegExp(d, 'i')) };
      }
    }
    const students = await User.find(studentQuery, '_id name email rollNumber department year').sort({ name: 1 });

    res.json({
      subjects: Array.from(subjects).sort(),
      years: Array.from(years).sort(),
      teachers: teachers,
      departments: Array.from(departments).sort(),
      students: students
    });
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ message: 'Error fetching metadata' });
  }
};

// @desc    Get filtered attendance data (JSON)
// @route   GET /api/reports/attendance
// @access  Private/Admin,Principal,Vice-Principal,Teacher
const getAttendanceReports = async (req, res) => {
  try {
    const query = await buildAttendanceQuery(req.query, req.user);
    
    const attendanceData = await Attendance.find(query)
      .populate('batch', 'batchName department year')
      .populate('teacher', 'name email')
      .populate('student', 'name email rollNumber'); 
      
    // Group documents into sessions for the frontend UI
    const sessionsMap = {};
    attendanceData.forEach(record => {
      // Create a unique composite key for a session
      const batchId = record.batch?._id || 'lecture';
      const dept = record.department || record.batch?.department || 'Not Categorized';
      const key = `${batchId}-${record.date}-${record.time}-${record.sessionType}-${record.subject}`;
      
      if (!sessionsMap[key]) {
        sessionsMap[key] = {
          batch: record.batch,
          teacher: record.teacher,
          date: record.date,
          time: record.time,
          sessionType: record.sessionType,
          subject: record.subject,
          department: dept,
          year: record.year || record.batch?.year || 'N/A',
          records: []
        };
      }
      sessionsMap[key].records.push({
        student: record.student,
        status: record.status
      });
    });

    res.json(Object.values(sessionsMap));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download filtered attendance data (CSV - Pivot Style)
// @route   GET /api/reports/attendance/csv
// @access  Private/Admin,Principal,Vice-Principal,Teacher
const downloadAttendanceCSV = async (req, res) => {
  try {
    const query = await buildAttendanceQuery(req.query, req.user);
    const attendanceData = await Attendance.find(query)
      .populate('batch', 'batchName department year')
      .populate('teacher', 'name email')
      .populate('student', 'name email rollNumber')
      .sort({ date: 1, time: 1 });

    if (attendanceData.length === 0) {
      return res.status(404).json({ message: 'No records found for the given filters' });
    }

    // 1. Identify all unique sessions in the period
    const sessionsMap = {};
    attendanceData.forEach(record => {
      const key = `${new Date(record.date).toISOString()}_${record.time}_${record.sessionType}`;
      if (!sessionsMap[key]) {
        sessionsMap[key] = {
          date: new Date(record.date).toLocaleDateString('en-IN'),
          time: record.time,
          sessionType: record.sessionType,
          key: key
        };
      }
    });

    // Sort sessions chronologically
    const sortedSessions = Object.values(sessionsMap).sort((a, b) => a.key.localeCompare(b.key));

    // 2. Group by Student
    const studentStats = {};
    attendanceData.forEach(record => {
      if (!record.student) return;
      const sId = record.student._id.toString();
      
      if (!studentStats[sId]) {
        studentStats[sId] = {
          Name: record.student.name,
          RollNo: record.student.rollNumber || 'N/A',
          Department: record.department || (record.batch?.department || 'N/A'),
          Year: record.year || (record.batch?.year || 'N/A'),
          Subject: record.subject,
          Teacher: record.teacher?.name || 'N/A',
          batches: new Set(),
          sessions: {},
          presentCount: 0
        };
      }
      
      if (record.batch && record.batch.batchName) {
        studentStats[sId].batches.add(record.batch.batchName);
      }

      const sessionKey = `${new Date(record.date).toISOString()}_${record.time}_${record.sessionType}`;
      studentStats[sId].sessions[sessionKey] = record.status;
      if (record.status === 'Present') {
        studentStats[sId].presentCount++;
      }
    });

    // 3. Prepare CSV Rows
    const csvRows = Object.values(studentStats).map(student => {
      const row = {
        'Roll Number': student.RollNo,
        'Student Name': student.Name,
        'Department': student.Department,
        'Year': student.Year,
        'Subject': student.Subject,
        'Teacher': student.Teacher,
        'Batch': student.batches.size > 0 ? Array.from(student.batches).join(', ') : 'All'
      };

      sortedSessions.forEach(s => {
        const typeShort = s.key.includes('Lecture') ? 'L' : 'P';
        const header = `${s.date} (${typeShort})`;
        const status = student.sessions[s.key] || '-';
        row[header] = status === 'Present' ? 'P' : (status === 'Absent' ? 'A' : '-');
      });

      const totalLectures = sortedSessions.length;
      const perc = totalLectures > 0 ? Math.round((student.presentCount / totalLectures) * 100) : 0;
      const attendanceStatus = perc < 76 ? 'DEFAULTER' : 'GOOD';

      row['Total Lectures'] = totalLectures;
      row['Present Count'] = student.presentCount;
      row['Attendance %'] = `${perc}%`;
      row['Attendance Status'] = attendanceStatus;
      return row;
    });

    // 4. Define CSV Fields
    const baseFields = ['Roll Number', 'Student Name', 'Batch', 'Department', 'Year', 'Subject', 'Teacher'];
    const sessionFields = sortedSessions.map(s => {
       const typeShort = s.key.includes('Lecture') ? 'L' : 'P';
       return `${s.date} (${typeShort})`;
    });
    const finalFields = [...baseFields, ...sessionFields, 'Total Lectures', 'Present Count', 'Attendance %', 'Attendance Status'];

    const json2csvParser = new Parser({ fields: finalFields });
    const csv = json2csvParser.parse(csvRows);

    res.header('Content-Type', 'text/csv');
    res.attachment(`Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);

  } catch (error) {
    console.error('CSV Export Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student-wise analytics (Attendance %)
// @route   GET /api/reports/analytics
// @access  Private/Admin,Principal,Vice-Principal,HOD,Teacher
const getStudentAnalytics = async (req, res) => {
  try {
    const query = await buildAttendanceQuery(req.query, req.user);
    const { lowAttendance } = req.query;

    const attendanceData = await Attendance.find(query)
      .populate('student', 'name email rollNumber department year');

    // Group by student
    const studentStats = {};

    attendanceData.forEach(record => {
      if (!record.student) return;
      const sId = record.student._id.toString();
      
      if (!studentStats[sId]) {
        studentStats[sId] = {
          _id: sId,
          name: record.student.name,
          rollNumber: record.student.rollNumber,
          department: record.student.department,
          year: record.student.year,
          total: 0,
          present: 0
        };
      }
      
      studentStats[sId].total += 1;
      if (record.status === 'Present') {
        studentStats[sId].present += 1;
      }
    });

    let results = Object.values(studentStats).map(s => ({
      ...s,
      percentage: Math.round((s.present / s.total) * 100)
    }));

    // Filter by low attendance if flag is set
    if (lowAttendance === 'true') {
      results = results.filter(s => s.percentage < 75);
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats for attendance (Principal/VP)
// @route   GET /api/reports/stats
// @access  Private/Admin,Principal,Vice-Principal,HOD
const getAttendanceStats = async (req, res) => {
  try {
    const filters = { ...req.query };

    // ── Default to TODAY if no date range is provided ─────────────────────────
    // Attendance records are stored as new Date(dateString) → UTC midnight.
    // e.g. teacher picks "2026-04-19" → stored as 2026-04-19T00:00:00.000Z
    // We must use IST-aware date to get the correct "today" string, then build
    // UTC midnight boundaries that match the stored documents.
    if (!filters.startDate && !filters.endDate) {
      // IST = UTC+5:30 → add 5.5 hours to get current IST date
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const nowIST = new Date(Date.now() + IST_OFFSET_MS);
      const todayIST = nowIST.toISOString().slice(0, 10); // "YYYY-MM-DD" in IST

      // Match exactly how attendance is stored: new Date("YYYY-MM-DD") = UTC midnight
      const todayStart = new Date(todayIST + 'T00:00:00.000Z'); // start of day UTC
      const todayEnd   = new Date(todayIST + 'T23:59:59.999Z'); // end of day UTC

      filters._todayStart = todayStart;
      filters._todayEnd   = todayEnd;
    }

    const query = await buildAttendanceQuery(filters, req.user);

    // Apply the today range AFTER buildAttendanceQuery (which only handles string params)
    if (filters._todayStart) {
      query.date = { $gte: filters._todayStart, $lte: filters._todayEnd };
    }

    // 1. Overall Stats (Present / Absent)
    const overall = await Attendance.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 2. Department-wise Stats (present + total)
    const deptStats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$department',
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          total:   { $sum: 1 }
        }
      },
      {
        $project: {
          department: '$_id',
          present: 1,
          total: 1,
          percentage: {
            $multiply: [{ $divide: ['$present', { $max: [1, '$total'] }] }, 100]
          }
        }
      },
      { $sort: { department: 1 } }
    ]);

    // 3. Year-wise Stats (present + total)
    const yearStats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$year',
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          total:   { $sum: 1 }
        }
      },
      {
        $project: {
          year: '$_id',
          present: 1,
          total: 1,
          percentage: {
            $multiply: [{ $divide: ['$present', { $max: [1, '$total'] }] }, 100]
          }
        }
      },
      { $sort: { year: 1 } }
    ]);

    // 4. Subject-wise Stats with Theory vs Practical split
    const subjectStats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: { subject: '$subject', sessionType: '$sessionType' },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'Absent']  }, 1, 0] } }
        }
      },
      { $sort: { '_id.subject': 1 } }
    ]);

    // Merge subject rows into one object per subject
    const subjectMap = {};
    subjectStats.forEach(row => {
      const subj = row._id.subject || 'Unknown';
      const type = row._id.sessionType; // 'Lecture' | 'Practical'
      if (!subjectMap[subj]) {
        subjectMap[subj] = {
          subject: subj,
          present: 0, absent: 0,
          lecturePresent: null, lectureAbsent: null,
          practicalPresent: null, practicalAbsent: null
        };
      }
      subjectMap[subj].present += row.present;
      subjectMap[subj].absent  += row.absent;
      if (type === 'Lecture') {
        subjectMap[subj].lecturePresent = (subjectMap[subj].lecturePresent ?? 0) + row.present;
        subjectMap[subj].lectureAbsent  = (subjectMap[subj].lectureAbsent  ?? 0) + row.absent;
      } else if (type === 'Practical') {
        subjectMap[subj].practicalPresent = (subjectMap[subj].practicalPresent ?? 0) + row.present;
        subjectMap[subj].practicalAbsent  = (subjectMap[subj].practicalAbsent  ?? 0) + row.absent;
      }
    });

    const subjects = Object.values(subjectMap).map(s => ({
      ...s,
      total: s.present + s.absent
    }));

    // 5. Session-type (Theory vs Practical) overall split
    const sessionBreakdownRaw = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$sessionType',
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'Absent']  }, 1, 0] } }
        }
      }
    ]);
    const sessionBreakdown = {};
    sessionBreakdownRaw.forEach(row => {
      if (row._id) sessionBreakdown[row._id] = { present: row.present, absent: row.absent };
    });

    // 6. Enrolled Student Counts (from User model — real headcount, not attendance records)
    const { department: deptFilter, year: yearFilter } = filters;

    // Build base student query
    const studentBaseQuery = { role: 'Student', status: 'Approved' };

    // HOD restriction: scope to their department
    if (req.user.role === 'HOD' && req.user.department?.length > 0) {
      studentBaseQuery.department = { $in: req.user.department.map(d => new RegExp(d, 'i')) };
    } else if (deptFilter) {
      studentBaseQuery.department = new RegExp(deptFilter, 'i');
    }
    if (yearFilter) {
      studentBaseQuery.year = new RegExp(yearFilter, 'i');
    }

    // Total enrolled students matching the current scope
    const totalStudents = await User.countDocuments(studentBaseQuery);

    // Per-department student counts — unwind array field before grouping
    let deptStudentCounts = [];
    if (!deptFilter) {
      const hodDeptMatch = req.user.role === 'HOD' && req.user.department?.length > 0
        ? { $in: req.user.department }
        : null;

      const deptPipeline = [
        {
          $match: {
            role: 'Student',
            status: 'Approved',
            ...(hodDeptMatch ? { department: hodDeptMatch } : {})
          }
        },
        { $unwind: '$department' },            // ← flatten the array into individual docs
        ...(hodDeptMatch ? [{ $match: { department: hodDeptMatch } }] : []),
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ];

      const deptCountsRaw = await User.aggregate(deptPipeline);
      deptStudentCounts = deptCountsRaw.map(d => ({ department: d._id, studentCount: d.count }));
    }

    // Per-year student counts — unwind array field before grouping
    let yearStudentCounts = [];
    if (!yearFilter) {
      const hodDeptForYear = req.user.role === 'HOD' && req.user.department?.length > 0
        ? { $in: req.user.department }
        : null;

      const yearPipeline = [
        {
          $match: {
            role: 'Student',
            status: 'Approved',
            ...(hodDeptForYear  ? { department: hodDeptForYear } : {}),
            ...(deptFilter      ? { department: new RegExp(deptFilter, 'i') } : {})
          }
        },
        { $unwind: '$year' },                  // ← flatten the year array
        { $group: { _id: '$year', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ];

      const yearCountsRaw = await User.aggregate(yearPipeline);
      yearStudentCounts = yearCountsRaw.map(y => ({ year: y._id, studentCount: y.count }));
    }

    // ── 7. Daily Trends (Time Series) ──────────────────────────────────────────
    const dailyTrendsRaw = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Format daily trends into an array of { date, present, absent }
    const trendsMap = {};
    dailyTrendsRaw.forEach(row => {
      const d = row._id.date;
      if (!trendsMap[d]) trendsMap[d] = { date: d, present: 0, absent: 0 };
      if (row._id.status === 'Present') trendsMap[d].present += row.count;
      else if (row._id.status === 'Absent') trendsMap[d].absent += row.count;
    });
    const dailyTrends = Object.values(trendsMap).sort((a,b) => a.date.localeCompare(b.date));

    // 7. Not Submitted — enrolled students with NO attendance record in current scope
    // Count unique students who DO have an attendance record
    const submittedStudentIds = await Attendance.distinct('student', query);
    const submittedCount = submittedStudentIds.length;
    // notSubmitted = total enrolled - those with any attendance record
    const notSubmitted = Math.max(0, totalStudents - submittedCount);

    res.json({
      overall: {
        present: overall.find(o => o._id === 'Present')?.count || 0,
        absent:  overall.find(o => o._id === 'Absent')?.count  || 0,
      },
      totalStudents,
      notSubmitted,
      deptStudentCounts,
      yearStudentCounts,
      dailyTrends,
      departments:      deptStats,
      years:            yearStats,
      subjects,
      sessionBreakdown
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download filtered attendance data (PDF - Premium Formate)
// @route   GET /api/reports/attendance/pdf
// @access  Private/Admin,Principal,Vice-Principal,Teacher
const downloadAttendancePDF = async (req, res) => {
  try {
    const PdfPrinter = require('pdfmake');
    const query = await buildAttendanceQuery(req.query, req.user);
    const attendanceData = await Attendance.find(query)
      .populate('batch', 'batchName department year')
      .populate('teacher', 'name email')
      .populate('student', 'name email rollNumber')
      .sort({ date: 1, time: 1 });

    if (!attendanceData || attendanceData.length === 0) {
      return res.status(404).json({ message: 'No attendance records discovered for these filters.' });
    }

    // 1. Setup Data structures
    const sessionsMap = {};
    attendanceData.forEach(record => {
      if (!record.date) return;
      const key = `${new Date(record.date).toISOString()}_${record.time || 'N/A'}_${record.sessionType || 'Lecture'}`;
      if (!sessionsMap[key]) {
        sessionsMap[key] = {
          date: new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' }),
          time: record.time || '',
          key: key
        };
      }
    });

    const sortedSessions = Object.values(sessionsMap).sort((a, b) => a.key.localeCompare(b.key));
    const sessionsToShow = sortedSessions.slice(0, 10); // Landscape limit

    const studentStats = {};
    attendanceData.forEach(record => {
      if (!record.student) return;
      const sId = record.student._id.toString();
      if (!studentStats[sId]) {
        studentStats[sId] = {
          Name: record.student.name,
          RollNo: record.student.rollNumber || 'N/A',
          sessions: {},
          presentCount: 0
        };
      }
      const sKey = `${new Date(record.date).toISOString()}_${record.time || 'N/A'}_${record.sessionType || 'Lecture'}`;
      studentStats[sId].sessions[sKey] = record.status;
      if (record.status === 'Present') studentStats[sId].presentCount++;
    });

    // 2. Define Fonts (Using standard PDF fonts)
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    const printer = new PdfPrinter(fonts);

    // 3. Build Table Body
    const tableHeader = [
      { text: 'ROLL', style: 'tableHeader', alignment: 'center' },
      { text: 'STUDENT NAME', style: 'tableHeader' },
      ...sessionsToShow.map(s => ({ text: s.date, style: 'tableHeader', alignment: 'center', fontSize: 7 })),
      { text: 'TOT', style: 'tableHeader', alignment: 'center' },
      { text: 'PRE', style: 'tableHeader', alignment: 'center' },
      { text: '%', style: 'tableHeader', alignment: 'center' }
    ];

    const tableRows = Object.values(studentStats).map((student, idx) => {
      const row = [
        { text: student.RollNo, alignment: 'center', fontSize: 8, fillColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff' },
        { text: student.Name, fontSize: 8, bold: true, fillColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff' }
      ];

      sessionsToShow.forEach(s => {
        const status = student.sessions[s.key];
        const isPresent = status === 'Present';
        row.push({ 
          text: isPresent ? 'P' : (status === 'Absent' ? 'A' : '-'), 
          color: isPresent ? '#059669' : '#dc2626',
          fillColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
          alignment: 'center',
          fontSize: 8,
          bold: true
        });
      });

      const totalSess = sortedSessions.length;
      const perc = totalSess > 0 ? Math.round((student.presentCount / totalSess) * 100) : 0;
      
      row.push(
        { text: totalSess, alignment: 'center', fontSize: 8, fillColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff' },
        { text: student.presentCount, alignment: 'center', fontSize: 8, bold: true, color: '#4f46e5', fillColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff' },
        { text: `${perc}%`, alignment: 'center', fontSize: 8, bold: true, color: perc < 75 ? '#dc2626' : '#059669', fillColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff' }
      );
      return row;
    });

    // 4. Document Definition
    const docDefinition = {
      pageOrientation: 'landscape',
      pageSize: 'A4',
      pageMargins: [30, 70, 30, 40],
      defaultStyle: { font: 'Helvetica' },
      header: (currentPage) => {
        if (currentPage === 1) {
          return {
            canvas: [
              { type: 'rect', x: 0, y: 0, w: 842, h: 50, color: '#1e293b' }
            ],
            absolutePosition: { x: 0, y: 0 }
          };
        }
        return null;
      },
      footer: (currentPage, pageCount) => {
        return {
          columns: [
            { text: `System Generated Report | ${new Date().toLocaleString()}`, style: 'footerText', margin: [30, 10] },
            { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right', margin: [30, 10] }
          ]
        };
      },
      content: [
        {
          columns: [
            {
              stack: [
                { text: 'ATTENDANCE TRACKER PRO', color: 'white', fontSize: 16, bold: true, margin: [0, -50, 0, 0] },
                { text: 'SKN Sinhgad College of Engineering', color: '#94a3b8', fontSize: 8, bold: true, margin: [0, -5, 0, 30] }
              ]
            }
          ]
        },
        {
          columns: [
            { stack: [{ text: 'SUBJECT', style: 'metaLabel' }, { text: filters.subject || attendanceData[0].subject, style: 'metaValue' }] },
            { stack: [{ text: 'DEPARTMENT', style: 'metaLabel' }, { text: filters.department || (attendanceData[0].department || attendanceData[0].batch?.department || 'ALL'), style: 'metaValue' }] },
            { stack: [{ text: 'ACADEMIC YEAR', style: 'metaLabel' }, { text: filters.year || (attendanceData[0].year || attendanceData[0].batch?.year || 'ALL'), style: 'metaValue' }] },
            { stack: [{ text: 'TEACHER', style: 'metaLabel' }, { text: attendanceData[0].teacher?.name || 'N/A', style: 'metaValue' }] },
          ],
          margin: [0, 0, 0, 20]
        },
        {
          table: {
            headerRows: 1,
            widths: [35, '*', ...sessionsToShow.map(() => 22), 25, 25, 25],
            body: [tableHeader, ...tableRows]
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#e2e8f0',
            vLineColor: () => '#e2e8f0',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 4,
            paddingBottom: () => 4
          }
        }
      ],
      styles: {
        tableHeader: { bold: true, fontSize: 8, color: 'white', fillColor: '#334155' },
        metaLabel: { fontSize: 7, color: '#64748b', bold: true },
        metaValue: { fontSize: 10, color: '#1e293b', bold: true },
        footerText: { fontSize: 7, color: '#94a3b8' }
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    // Efficient chunked response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Attendance_Summary.pdf');
    
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error('PDF CRASH:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'The PDF generation engine encountered an error. Please contact admin.' });
    }
  }
};

// @desc    Get time-series attendance data for charts
// @route   GET /api/reports/teacher-analytics
// @access  Private/Teacher,Admin,Principal,HOD
const getTeacherAnalyticsTimeSeries = async (req, res) => {
  try {
    const query = await buildAttendanceQuery(req.query, req.user);
    const aggregation = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    const chartDataMap = {};
    aggregation.forEach(item => {
      const date = item._id.date;
      if (!chartDataMap[date]) {
        chartDataMap[date] = { date, Present: 0, Absent: 0 };
      }
      if (item._id.status === 'Present') chartDataMap[date].Present = item.count;
      if (item._id.status === 'Absent') chartDataMap[date].Absent = item.count;
    });

    res.json(Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAttendanceReports,
  getAttendanceStats,
  downloadAttendanceCSV,
  downloadAttendancePDF,
  getStudentAnalytics,
  getTeacherAnalyticsTimeSeries,
  getFiltersMetadata
};
