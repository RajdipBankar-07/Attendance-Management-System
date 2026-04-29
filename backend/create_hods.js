const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const hods = [
  { name: 'HOD COMPUTER SCI', email: 'hodcse@skn.ac', password: 'cse', role: 'HOD', department: ['CSE'], status: 'Approved', gender: 'Male' },
  { name: 'HOD E&TC', email: 'hode&tc@skn.ac', password: 'e&tc', role: 'HOD', department: ['E&TC'], status: 'Approved', gender: 'Male' },
  { name: 'HOD MECHANICAL', email: 'hodmach@skn.ac', password: 'mach', role: 'HOD', department: ['MECH'], status: 'Approved', gender: 'Male' },
  { name: 'HOD CIVIL', email: 'hodcivil@skn.ac', password: 'civil', role: 'HOD', department: ['CIVIL'], status: 'Approved', gender: 'Male' },
  { name: 'HOD ELECTRICAL', email: 'hodelct@skn.ac', password: 'elct', role: 'HOD', department: ['ELECT'], status: 'Approved', gender: 'Male' }
];

const seedHods = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const hod of hods) {
      const exists = await User.findOne({ email: hod.email });
      if (exists) {
        console.log(`User ${hod.email} already exists, updating...`);
        exists.password = hod.password;
        exists.role = 'HOD';
        exists.department = hod.department;
        exists.status = 'Approved';
        await exists.save();
      } else {
        await User.create(hod);
        console.log(`User ${hod.email} created.`);
      }
    }

    console.log('HOD Seeding complete.');
    process.exit();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedHods();
