import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layouts
import AdminLayout from './components/AdminLayout';
import PrincipalLayout from './components/PrincipalLayout';
import HODLayout from './components/HODLayout';
import TeacherLayout from './components/TeacherLayout';
import StudentLayout from './components/StudentLayout';

// Pages
import Login from './pages/Login';
import Users from './pages/Users';
import Batches from './pages/Batches';
import Reports from './pages/Reports';
import TeacherBatches from './pages/TeacherBatches';
import TeacherAnalytics from './pages/TeacherAnalytics';
import TeacherNotes from './pages/TeacherNotes';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PrincipalDashboard from './pages/PrincipalDashboard';
import Announcements from './pages/Announcements';

import { useLocation } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';

const ProfileSync = () => {
  const { user, refreshUser } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    if (user && user.token && location.pathname !== '/login') {
      refreshUser();
    }
  }, [location.pathname]);

  return null;
};

function App() {
  return (
    <NotificationProvider>
      <ProfileSync />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="batches" element={<Batches />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>

        {/* Principal & Vice-Principal Routes (Vice-Principal redirects to /principal from Login) */}
        <Route path="/principal" element={<PrincipalLayout />}>
          <Route index element={<PrincipalDashboard />} />
          <Route path="dashboard" element={<PrincipalDashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>

        {/* HOD Routes */}
        <Route path="/hod" element={<HODLayout />}>
          <Route index element={<PrincipalDashboard />} />
          <Route path="dashboard" element={<PrincipalDashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<Navigate to="/teacher/batches" />} />
          <Route path="batches" element={<TeacherBatches />} />
          <Route path="analytics" element={<TeacherAnalytics />} />
          <Route path="notes" element={<TeacherNotes />} />
          <Route path="reports" element={<Reports />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>

        {/* Student Routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="/student/dashboard" />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>

        {/* Default Redirection */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </NotificationProvider>
  );
}

export default App;
