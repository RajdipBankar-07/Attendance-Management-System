const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/attendance-db')
.then(async () => {
  console.log('Connected to MongoDB');
  
  const User = mongoose.connection.collection('users');
  
  // Fetch all users
  const users = await User.find({}).toArray();
  let updatedUsersCount = 0;

  for (const user of users) {
    let changed = false;
    let newDept = user.department;

    if (Array.isArray(newDept)) {
        if (newDept.includes('ENTC')) {
            newDept = newDept.map(d => d === 'ENTC' ? 'E&TC' : d);
            changed = true;
        }
    } else if (typeof newDept === 'string') {
        if (newDept === 'ENTC') {
            newDept = 'E&TC';
            changed = true;
        }
    }

    if (changed) {
        await User.updateOne({ _id: user._id }, { $set: { department: newDept } });
        updatedUsersCount++;
    }
  }
  
  const Batch = mongoose.connection.collection('batches');
  const batches = await Batch.find({}).toArray();
  let updatedBatchesCount = 0;

  for (const batch of batches) {
    let changed = false;
    let newDept = batch.department;

    if (Array.isArray(newDept)) {
        if (newDept.includes('ENTC')) {
            newDept = newDept.map(d => d === 'ENTC' ? 'E&TC' : d);
            changed = true;
        }
    } else if (typeof newDept === 'string') {
        if (newDept === 'ENTC') {
            newDept = 'E&TC';
            changed = true;
        }
    }

    if (changed) {
        await Batch.updateOne({ _id: batch._id }, { $set: { department: newDept } });
        updatedBatchesCount++;
    }
  }

  console.log(`Successfully updated ${updatedUsersCount} users and ${updatedBatchesCount} batches.`);
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
