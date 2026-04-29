const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/attendance-db').then(async () => {
  const User = mongoose.connection.collection('users');
  const users = await User.find({}).toArray();
  const depts = new Set();
  users.forEach(u => {
     if(Array.isArray(u.department)) u.department.forEach(d => depts.add(d));
     else if(u.department) depts.add(u.department);
  });
  console.log(Array.from(depts));
  process.exit();
});
