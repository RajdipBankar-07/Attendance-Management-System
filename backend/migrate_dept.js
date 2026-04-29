const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/attendance-system')
.then(async () => {
  console.log('Connected to MongoDB');
  
  const User = mongoose.connection.collection('users');
  
  // Replace array fields if department is an array
  await User.updateMany(
    { department: 'ENTC' },
    { $set: { "department.$": "E&TC" } }
  );

  // Replace string fields if department is a string
  await User.updateMany(
    { department: 'ENTC' },
    { $set: { department: "E&TC" } }
  );
  
  const Batch = mongoose.connection.collection('batches');
  await Batch.updateMany(
    { department: 'ENTC' },
    { $set: { department: "E&TC" } }
  );

  console.log('Successfully updated ENTC to E&TC');
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
