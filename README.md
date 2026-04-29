# 📋 Attendance Management System

<div align="center">

![Attendance Management System](https://img.shields.io/badge/Attendance-Management%20System-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb)
![License](https://img.shields.io/badge/License-ISC-yellow?style=for-the-badge)

A full-stack web application to digitize and streamline student attendance tracking for educational institutions — with role-based dashboards for Admins, Teachers, Students, and Principals.

</div>

---

## 📌 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Roles & Dashboards](#-roles--dashboards)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Screenshots](#-screenshots)
- [Author](#-author)

---

## ✨ Features

- 🔐 **JWT-based Authentication** — Secure login for all roles
- 👥 **Role-Based Access Control** — Admin, Teacher, Student, Principal
- 📅 **Attendance Tracking** — Mark, view, and manage daily attendance
- 📊 **Reports & Analytics** — Generate attendance reports (PDF & CSV export)
- 📢 **Announcements** — Post and view notices for students/teachers
- 📝 **Teacher Notes** — Teachers can add personal notes per batch
- 🗂️ **Batch Management** — Create and manage class batches
- 📋 **Audit Logs** — Track all system actions for accountability
- 📈 **Teacher Analytics** — Visual charts using Recharts
- 🖨️ **PDF Export** — Download reports using jsPDF + AutoTable

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | REST API server |
| **MongoDB + Mongoose** | Database & ODM |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **dotenv** | Environment configuration |
| **pdfmake** | PDF generation |
| **json2csv** | CSV report export |
| **cors** | Cross-origin requests |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite** | Build tool & dev server |
| **React Router DOM v7** | Client-side routing |
| **Axios** | HTTP requests |
| **Recharts** | Charts & analytics |
| **jsPDF + AutoTable** | PDF export |
| **Tailwind CSS** | Utility-first styling |

---

## 📁 Project Structure

```
Attendance-Management-System/
│
├── backend/
│   ├── src/
│   │   ├── config/           # Database connection
│   │   ├── controllers/      # Business logic
│   │   │   ├── authController.js
│   │   │   ├── attendanceController.js
│   │   │   ├── userController.js
│   │   │   ├── batchController.js
│   │   │   ├── reportController.js
│   │   │   ├── noteController.js
│   │   │   ├── auditController.js
│   │   │   └── announcementController.js
│   │   ├── middlewares/      # Auth & error handlers
│   │   ├── models/           # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Attendance.js
│   │   │   ├── Batch.js
│   │   │   ├── Note.js
│   │   │   ├── AuditLog.js
│   │   │   └── Announcement.js
│   │   ├── routes/           # Express routes
│   │   ├── utils/            # Helper utilities
│   │   ├── app.js            # Express app setup
│   │   └── server.js         # Server entry point
│   ├── seed.js               # Database seeder
│   ├── .env                  # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── assets/           # Static assets
    │   ├── components/       # Reusable UI components
    │   ├── context/          # React context (auth state)
    │   ├── pages/            # Page components
    │   │   ├── Login.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   ├── PrincipalDashboard.jsx
    │   │   ├── TeacherBatches.jsx
    │   │   ├── TeacherAnalytics.jsx
    │   │   ├── TeacherNotes.jsx
    │   │   ├── StudentDashboard.jsx
    │   │   ├── Batches.jsx
    │   │   ├── Users.jsx
    │   │   ├── Reports.jsx
    │   │   └── Announcements.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── vite.config.js
    └── package.json
```

---

## 👤 Roles & Dashboards

| Role | Capabilities |
|---|---|
| **Admin** | Manage users, batches, view audit logs, all reports |
| **Principal** | View overall reports, analytics, announcements |
| **Teacher** | Mark attendance, manage batches, add notes, view analytics |
| **Student** | View personal attendance, view announcements |

---

## 🔌 API Endpoints

| Module | Base Route | Description |
|---|---|---|
| Auth | `/api/auth` | Login, logout, token refresh |
| Users | `/api/users` | CRUD for user management |
| Batches | `/api/batches` | Create, update, delete batches |
| Attendance | `/api/attendance` | Mark & fetch attendance records |
| Reports | `/api/reports` | Generate attendance reports |
| Notes | `/api/notes` | Teacher notes per batch |
| Audit Logs | `/api/audit` | System activity logs |
| Announcements | `/api/announcements` | Post & retrieve announcements |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- npm v9+

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/RajdipBankar-07/Attendance-Management-System.git
cd Attendance-Management-System
```

### 2️⃣ Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see [Environment Variables](#-environment-variables)).

Start the backend server:

```bash
node src/server.js
```

> Backend runs on `http://localhost:5000`

### 3️⃣ Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

> Frontend runs on `http://localhost:5173`

### 4️⃣ Seed the Database (Optional)

To populate the database with initial demo data:

```bash
cd backend
node seed.js
```

---

## 🔐 Environment Variables

Create a `.env` file inside the `backend/` directory with the following keys:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/attendance_db
JWT_SECRET=your_jwt_secret_key
```

| Variable | Description |
|---|---|
| `PORT` | Port for the backend server (default: 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT token signing |

---



## 👨‍💻 Author

**Rajdip Bankar**

- GitHub: [@RajdipBankar-07](https://github.com/RajdipBankar-07)

---

<div align="center">
  <sub>Built with ❤️ for modern educational institutions</sub>
</div>
