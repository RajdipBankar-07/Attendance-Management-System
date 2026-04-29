import React, { useState, useEffect, useContext, useRef } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const AdminLayout = () => {
  const { user, loading, logout } = useContext(AuthContext);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef(null);

  const fetchPendingUsers = async () => {
    try {
      const { data } = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPendingUsers(data.filter(u => u.status === 'Pending'));
    } catch (error) {
      console.error('Error fetching pending users:', error);
    }
  };

  useEffect(() => {
    if (user && user.token) {
      fetchPendingUsers();
      const interval = setInterval(fetchPendingUsers, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickStatusUpdate = async (userId, status) => {
    setIsUpdating(true);
    try {
      await axios.put(`/api/users/${userId}/status`, { status }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      await fetchPendingUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
    </div>
  );
  
  if (!user || user.role !== 'Admin') {
    return <Navigate to="/login" />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { name: 'Manage Users', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: 'Announcements', path: '/admin/announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    { name: 'Manage Batches', path: '/admin/batches', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#11141d] border-r border-slate-800/40 flex flex-col fixed inset-y-0 shadow-2xl z-30 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
             </div>
             <div>
                <h2 className="text-lg font-black tracking-tighter text-white">EduAttend</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Smart System</p>
             </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-sm font-bold ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                }`
              }
            >
              <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/40">
           <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30 flex items-center justify-between group">
              <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                   {user.name.charAt(0)}
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{user.role}</p>
                 </div>
              </div>
              <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
              </button>
           </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-end px-8 z-20">
           <div className="flex items-center gap-6">
              <div className="relative" ref={dropdownRef}>
                 <button 
                   onClick={() => setShowNotifications(!showNotifications)}
                   className="relative p-2 text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-95"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                   </svg>
                   {pendingUsers.length > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                   )}
                   {pendingUsers.length > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0a0c10]"></span>
                   )}
                 </button>

                 {showNotifications && (
                   <div className="absolute right-0 mt-3 w-80 bg-[#11141d] border border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden transform origin-top-right">
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
                         <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Pending Requests</h3>
                         <span className="px-2 py-0.5 bg-indigo-600 text-[10px] font-black text-white rounded-full">{pendingUsers.length}</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                         {pendingUsers.length > 0 ? (
                           pendingUsers.map(u => (
                             <div key={u._id} className="p-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition-all group">
                                <p className="text-sm font-bold text-white mb-1">{u.name}</p>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{u.role} | {u.department || 'GLOBAL'}</p>
                                <div className="flex gap-2 mt-3">
                                   <button 
                                     disabled={isUpdating}
                                     onClick={() => handleQuickStatusUpdate(u._id, 'Approved')}
                                     className="flex-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                   >
                                     Approve
                                   </button>
                                   <button 
                                     disabled={isUpdating}
                                     onClick={() => handleQuickStatusUpdate(u._id, 'Blocked')}
                                     className="px-3 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/10 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                   >
                                     X
                                   </button>
                                </div>
                             </div>
                           ))
                         ) : (
                           <div className="p-10 text-center opacity-30">
                              <p className="text-xs font-bold uppercase tracking-widest">Inbox Zero</p>
                           </div>
                         )}
                      </div>
                      <NavLink 
                         to="/admin/users" 
                         onClick={() => setShowNotifications(false)}
                         className="block p-3 text-center text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] hover:bg-indigo-600 hover:text-white transition-all bg-slate-900/20"
                      >
                         View All Members
                      </NavLink>
                   </div>
                 )}
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-all font-bold text-xs uppercase tracking-widest group"
              >
                 <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
                 Logout
              </button>
           </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-8 pt-0">
           <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
             <Outlet />
           </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
