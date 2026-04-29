require('dotenv').config();
const User = require('./src/models/User');
const Batch = require('./src/models/Batch');
const Attendance = require('./src/models/Attendance');
require('./src/config/db')().then(async () => {

  const batches    = await Batch.countDocuments();
  const attendance = await Attendance.countDocuments();

  console.log('=== MongoDB Full Verification ===');
  console.log('Batches      :', batches);
  console.log('Attendance   :', attendance);

  if (batches > 0) {
    const sample = await Batch.find().populate('teacher', 'name').limit(5);
    console.log('\nSample Batches:');
    sample.forEach(b => console.log(`  ${b.batchName} | ${b.subject} | ${b.department} ${b.year} | Teacher: ${b.teacher?.name}`));
  } else {
    console.log('\n⚠️  NO BATCHES in DB yet — need to be created via Admin dashboard');
  }

  if (attendance > 0) {
    const sample = await Attendance.find().populate('student','name').limit(5);
    console.log('\nSample Attendance:');
    sample.forEach(a => console.log(`  ${a.student?.name} | ${a.subject} | ${a.status} | ${new Date(a.date).toDateString()}`));
  } else {
    console.log('⚠️  NO ATTENDANCE RECORDS in DB yet');
  }

  process.exit(0);
});
