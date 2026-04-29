const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/attendance-db')
.then(async () => {
  console.log('Connected to MongoDB');
  
  const User = mongoose.connection.collection('users');
  const Batch = mongoose.connection.collection('batches');

  const mapping = {
    'ENTC': 'E&TC',
    'ENTC ': 'E&TC',
    'Civil': 'CIVIL',
    'Electrical': 'ELECT',
    'elect': 'ELECT'
  };

  const collections = [User, Batch];

  for (const col of collections) {
    const records = await col.find({}).toArray();
    let updatedCount = 0;

    for (const record of records) {
      let changed = false;
      let dept = record.department;

      if (Array.isArray(dept)) {
          const newDept = dept.map(d => mapping[d] || d);
          if (JSON.stringify(newDept) !== JSON.stringify(dept)) {
              dept = newDept;
              changed = true;
          }
      } else if (typeof dept === 'string') {
          if (mapping[dept]) {
              dept = mapping[dept];
              changed = true;
          }
      }

      if (changed) {
          await col.updateOne({ _id: record._id }, { $set: { department: dept } });
          updatedCount++;
      }
    }
    console.log(`Updated ${updatedCount} records in ${col.collectionName}`);
  }

  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
