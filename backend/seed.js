require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const seedUsers = async () => {
  try {
    await connectDB();
    await User.deleteMany({});
    console.log('Cleared existing users...');

    // ─── ADMIN / PRINCIPAL ────────────────────────────────────────────────────
    const adminUsers = [
      { name: 'System Admin',           email: 'admin@skn.ac',           password: 'admin',           role: 'Admin',          status: 'Approved' },
      { name: 'College Principal',      email: 'principal@skn.ac',       password: 'principal',       role: 'Principal',      status: 'Approved' },
      { name: 'College Vice Principal', email: 'viceprincipal@skn.ac',   password: 'viceprincipal',   role: 'Vice-Principal', status: 'Approved' },
    ];

    // ─── TEACHERS (TY CSE SEM-II Timetable) ──────────────────────────────────
    // email = lastname@skn.ac | password = lastname
    const teachers = [
      { name: 'Asst. Prof. R.S. Yevale',   email: 'yevale@skn.ac',  password: 'yevale',  subject: ['SE', 'PIA'],      phone: '+919876500001' },
      { name: 'Asst. Prof. M.S. Koli',     email: 'koli@skn.ac',    password: 'koli',    subject: ['CC'],             phone: '+919876500002' },
      { name: 'Asst. Prof. D.P. Bhosale',  email: 'bhosale@skn.ac', password: 'bhosale', subject: ['SS'],             phone: '+919876500003' },
      { name: 'Asst. Prof. N.M. Sawant',   email: 'sawant@skn.ac',  password: 'sawant',  subject: ['NS'],             phone: '+919876500004' },
      { name: 'Asst. Prof. S.G. Linge',    email: 'linge@skn.ac',   password: 'linge',   subject: ['BDA', 'GD/NPTL'],phone: '+919876500005' },
      { name: 'DR. V.G. Jagtap',           email: 'jagtap@skn.ac',  password: 'jagtap',  subject: ['MDM'],            phone: '+919876500006' },
      { name: 'Asst. Prof. B.B. Jagdale',  email: 'jagdale@skn.ac', password: 'jagdale', subject: ['MDM'],            phone: '+919876500007' },
      { name: 'Dr. S.V. Pingale',          email: 'pingale@skn.ac', password: 'pingale', subject: ['DL'],             phone: '+919876500008' },
    ].map(t => ({
      ...t,
      role: 'Teacher',
      department: ['CSE'],
      year: ['T.Y'],
      status: 'Approved'
    }));

    // ─── STUDENTS (74 real students from TY Attendance Sheet) ─────────────────
    // Format: LASTNAME FIRSTNAME FATHERSNAME
    // email = firstname@gmail.com | password = firstname
    // Duplicate first names get initials appended: rutujas@gmail.com
    const rawStudents = [
      [1,  'CHAVAN RUTUJA UMESH'],        // rutuja@gmail.com / rutuja
      [2,  'CHAVAN ASHWINI GANGADHAR'],   // ashwini@gmail.com / ashwini
      [3,  'CHAVAN SHITAL DAGDU'],        // shitalcd@gmail.com — duplicate SHITAL (see 65,66 BAGAL SHITAL)
      [4,  'SHINDE SUHAS HANUMANT'],      // suhas@gmail.com / suhas
      [5,  'CHAUGULE PRITI DILIP'],       // priti@gmail.com / priti
      [6,  'KULKARNI MAYURI MANOJ'],      // mayuri@gmail.com / mayuri
      [7,  'JADHAV PRIYANKA RUSHIKESH'], // priyanka@gmail.com / priyanka
      [8,  'DONGRE PAYAL RAJENDRA'],     // payal@gmail.com / payal
      [9,  'KARANDE POOJA SHANKAR'],     // pooja@gmail.com / pooja
      [10, 'JOSHI SHREYA SUHAS'],        // shreya@gmail.com / shreya
      [11, 'MULANI ARJIYA NAUSHAD'],     // arjiya@gmail.com / arjiya
      [12, 'GODASE KULDIP MAHESH'],      // kuldip@gmail.com / kuldip
      [13, 'BANKAR RAJDIP VITTHAL'],     // rajdip@gmail.com / rajdip
      [14, 'ARADHYE AVADHUT ABHAY'],     // avadhut@gmail.com / avadhut
      [15, 'DHEKLE PRASHANT SANTOSH'],   // prashant@gmail.com / prashant
      [16, 'DANGE PRIYANKA BALU'],       // priyankadb@gmail.com — duplicate PRIYANKA (7)
      [17, 'KATE PRANALI KRISHNA'],      // pranali@gmail.com / pranali
      [18, 'SHIRTODE SWATI SATYAWAN'],   // swati@gmail.com / swati
      [19, 'KULKARNI PRATIK PRASHANT'],  // pratik@gmail.com / pratik
      [20, 'KULKARNI SARVESH PANDURANG'],// sarvesh@gmail.com / sarvesh
      [21, 'MOHITE ATHARV MAHESH'],      // atharv@gmail.com / atharv
      [22, 'MORE SHIVRAJ VIJAY'],        // shivraj@gmail.com / shivraj
      [23, 'WADEKAR GARGI PRASHANT'],    // gargi@gmail.com / gargi
      [24, 'BOLE ISHWARI SANTOSH'],      // ishwari@gmail.com / ishwari
      [25, 'PATIL HARSHVARDHAN SUNIL'],  // harshvardhan@gmail.com / harshvardhan
      [26, 'PUJARI PRASHANT DHONDIRAM'],// prashantpd@gmail.com — duplicate (15)
      [27, 'BANSODE SANKET BANDU'],      // sanket@gmail.com / sanket
      [28, 'AIVALE DIPAK BAPU'],         // dipak@gmail.com / dipak
      [29, 'KADAM SANGRAM ANNASO'],      // sangram@gmail.com / sangram
      [30, 'KADAM SHIVPRASAD SURESH'],   // shivprasad@gmail.com / shivprasad
      [31, 'JADHAV KIRAN SANJAY'],       // kiran@gmail.com / kiran
      [32, 'MULLA SANIYA MAINUDDIN'],    // saniya@gmail.com / saniya
      [33, 'PATHAN RESHMA MUJOFAR'],     // reshma@gmail.com / reshma
      [34, 'BHOSALE SUNIL DADARAO'],     // sunil@gmail.com / sunil
      [35, 'MULE SAGAR DATTATRAY'],      // sagar@gmail.com / sagar
      [36, 'SURVASE ABHISHEK RAJESH'],   // abhishek@gmail.com / abhishek
      [37, 'KARANDE ADITYA VIKAS'],      // aditya@gmail.com / aditya
      [38, 'LAWATE VIKRANT BHARAT'],     // vikrant@gmail.com / vikrant
      [39, 'PATIL RANJIT SANDIP'],       // ranjit@gmail.com / ranjit
      [40, 'MORE NIRANJAN CHANDRAKANT'], // niranjan@gmail.com / niranjan
      [41, 'BHOSALE VIKAS PANDURANG'],   // vikas@gmail.com / vikas
      [42, 'BILE PRATIK DATTATRAY'],     // pratikbd@gmail.com — duplicate (19)
      [43, 'NAGANE SAYALI KESHAV'],      // sayali@gmail.com / sayali
      [44, 'KULKARNI VEENA VISHWANATH'], // veena@gmail.com / veena
      [45, 'VASEKAR SANKALP SANTOSH'],   // sankalp@gmail.com / sankalp
      [46, 'KULKARNI AADESH MANDAR'],    // aadesh@gmail.com / aadesh
      [47, 'GOTAVLE SUSHMA SANJAY'],     // sushma@gmail.com / sushma
      [48, 'SADIGALE SHRAVANI SANTOSH'], // shravani@gmail.com / shravani
      [49, 'MALI VAISHNAVI SUKHADEV'],   // vaishnavi@gmail.com / vaishnavi
      [50, 'PATIL VIKRANT SHANKAR'],     // vikrantps@gmail.com — duplicate (38)
      [51, 'PATIL VISHVATEJ SIDDHESHWAR'],// vishvatej@gmail.com / vishvatej
      [52, 'TAMBOLI SAJID SHUKUR'],      // sajid@gmail.com / sajid
      [53, 'UTPAT AKSHAY ANAND'],        // akshay@gmail.com / akshay
      [54, 'SHINDE PRATHMESH CHANDRAKANT'],// prathmesh@gmail.com / prathmesh
      [55, 'SHINDE AKSHATA KUMAR'],      // akshata@gmail.com / akshata
      [56, 'PATHAN EKHARA MUSHTAK'],     // ekhara@gmail.com / ekhara
      [57, 'PARCHANDE SANIKA HARSHCHANDRA'],// sanika@gmail.com / sanika
      [58, 'KHILARE SAKSHI KALIDAS'],    // sakshi@gmail.com / sakshi
      [59, 'MALI RAJASHRI SAVATA'],      // rajashri@gmail.com / rajashri
      [60, 'SALUNKHE SAMRUDDHI MAHADEV'],// samruddhi@gmail.com / samruddhi
      [61, 'LOKARE SUJATA SHARAD'],      // sujata@gmail.com / sujata
      [62, 'GHALAME MAYUARI KISHOR'],    // mayuari@gmail.com / mayuari (note diff spelling from 6 MAYURI)
      [63, 'TATHE SHRAVANI RAJKUMAR'],   // shravanirt@gmail.com — duplicate (48)
      [64, 'SHENDAGE RUTUJA RAJENDRA'],  // rutujar@gmail.com — duplicate (1)
      [65, 'BAGAL SHITAL HANUMANT'],     // shitalh@gmail.com — duplicate (3,66)
      [66, 'BAGAL SHITAL MADHUKAR'],     // shitalm@gmail.com — duplicate (3,65)
      [67, 'CHAVAN RANJIT NETAJI'],      // ranjitcn@gmail.com — duplicate (39)
      [68, 'SURVASE VAIBHAV DIPAK'],     // vaibhav@gmail.com / vaibhav
      [69, 'MUNURREDDY YASH JAGDISH'],   // yash@gmail.com / yash
      [70, 'SANGAVE SUMIT SUNIL'],       // sumit@gmail.com / sumit
      [71, 'KARALE ATHARVA SATISH'],     // atharva@gmail.com / atharva
      [72, 'NARSALE RITESH NANASO'],     // ritesh@gmail.com / ritesh
      [73, 'PARDESHI ADITYA VILAS'],     // adityapv@gmail.com — duplicate (37)
      [74, 'BHOSALE VIKRANT PANDIT'],    // vikrantbp@gmail.com — duplicate (38,50)
    ];

    // Build email map to handle duplicates
    // email = firstname@gmail.com, if duplicate → firstname + lastname_initial@gmail.com
    const emailCounts = {};
    rawStudents.forEach(([, fullName]) => {
      const parts = fullName.trim().split(' ');
      const firstName = parts[1].toLowerCase();
      emailCounts[firstName] = (emailCounts[firstName] || 0) + 1;
    });

    const usedEmails = new Set();
    const students = rawStudents.map(([roll, fullName], idx) => {
      const parts = fullName.trim().split(' ');
      const lastName  = parts[0];
      const firstName = parts[1];
      const fatherName = parts[2] || '';
      
      const base = firstName.toLowerCase();
      let emailLocal = base;

      // If there are multiple students with same first name, use firstname+lastInitial
      if (emailCounts[base] > 1) {
        const attempt = base + lastName[0].toLowerCase();
        emailLocal = usedEmails.has(attempt + '@gmail.com')
          ? base + lastName.slice(0,2).toLowerCase()
          : attempt;
      }

      // Final safety dedup
      let finalEmail = emailLocal + '@gmail.com';
      let counter = 2;
      while (usedEmails.has(finalEmail)) {
        finalEmail = emailLocal + counter + '@gmail.com';
        counter++;
      }
      usedEmails.add(finalEmail);

      return {
        name: `${firstName} ${lastName}`,          // e.g. "Rutuja Chavan"
        email: finalEmail,                          // e.g. rutuja@gmail.com
        password: base,                             // e.g. rutuja
        role: 'Student',
        department: ['CSE'],
        year: ['T.Y'],
        subject: ['SE', 'CC', 'SS', 'NS', 'BDA', 'PIA', 'MDM', 'DL'],
        rollNumber: String(roll),
        studentPhone: `+9190000${String(10000 + idx).slice(1)}`,
        parentPhone:  `+9191000${String(10000 + idx).slice(1)}`,
        status: 'Approved'
      };
    });

    // ─── INSERT ALL ──────────────────────────────────────────────────────────
    for (const u of adminUsers) await User.create(u);
    for (const t of teachers)   await User.create(t);
    for (const s of students)   await User.create(s);

    console.log('\n✅  Database seeded successfully!');
    console.log(`   Admins    : ${adminUsers.length}`);
    console.log(`   Teachers  : ${teachers.length}`);
    console.log(`   Students  : ${students.length}`);
    console.log('\n📋  Sample Student Logins:');
    students.slice(0, 5).forEach(s => console.log(`   ${s.email.padEnd(28)} / ${s.password}`));
    console.log('\n🎓  Teacher Logins:');
    teachers.forEach(t => console.log(`   ${t.email.padEnd(28)} / ${t.password}  (${t.subject.join(', ')})`));
    process.exit(0);

  } catch (error) {
    console.error(`❌  Seed Error: ${error.message}`);
    process.exit(1);
  }
};

seedUsers();
