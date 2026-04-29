import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const DEPARTMENTS = ['CSE', 'IT', 'E&TC', 'MECH', 'CIVIL', 'ELECT', 'AIDS'];
const YEARS = ['F.Y', 'S.Y', 'T.Y', 'Final Year'];

const PhoneInput = ({ label, value, onChange }) => (
  <div className="space-y-2">
    {label && <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{label}</label>}
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <span className="text-slate-600 font-bold border-r border-slate-800 pr-3 text-[10px]">+91</span>
      </div>
      <input
        type="text"
        pattern="\d*"
        className="form-input !pl-14 tracking-widest font-mono text-sm border-slate-700/50 bg-slate-900/50 text-white w-full py-3 rounded-xl focus:border-indigo-500"
        placeholder="000 000 0000"
        maxLength={10}
        value={(value || '').replace('+91', '')}
        onKeyDown={(e) => {
          if (!/[\d\b]/.test(e.key) && !['ArrowLeft', 'ArrowRight', 'Backspace', 'Tab', 'Delete'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
          }
        }}
        onChange={(e) => {
          const rawValue = e.target.value.replace(/\D/g, '');
          onChange(rawValue ? `+91${rawValue}` : '');
        }}
      />
    </div>
  </div>
);

const Users = () => {
  const [users, setUsers] = useState([]);
  const { user } = useContext(AuthContext);
  const { showNotification } = useNotification();

  // Modals & Data State
  const [showHodModal, setShowHodModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [provisionData, setProvisionData] = useState({ name: '', email: '', password: '', role: 'HOD', department: '', gender: '' });
  const [editData, setEditData] = useState({ name: '', email: '', department: [], year: [], subject: [], role: '', password: '', gender: '', phone: '', studentPhone: '', parentPhone: '' });
  const [tempTags, setTempTags] = useState({ department: '', year: '', subject: '' });

  const [isProcessing, setIsProcessing] = useState(false);

  // UI Search/Filter State
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (user && user.token) fetchUsers();
  }, [user]);

  // ACTION HANDLERS
  const handleStatusUpdate = async (userId, status) => {
    try {
      await axios.put(`/api/users/${userId}/status`, { status }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showNotification(`User marked as ${status}`, 'success');
      fetchUsers();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Update failed', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) {
      setIsProcessing(true);
      try {
        await axios.delete(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        showNotification('Member removed permanently', 'success');
        fetchUsers();
      } catch (error) {
        showNotification(error.response?.data?.message || 'Delete failed', 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleProvisionUser = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await axios.post('/api/users/provision', provisionData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showNotification(`${provisionData.role} Created Successfully`, 'success');
      setShowHodModal(false);
      setProvisionData({ name: '', email: '', password: '', role: 'HOD', department: '', gender: '' });
      fetchUsers();
    } catch (error) {
      showNotification(error.response?.data?.message || `Failed to create ${provisionData.role}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Automatically add any pending text in tag inputs before saving
    const finalizedData = { ...editData };
    ['department', 'year', 'subject'].forEach(field => {
      const pendingVal = tempTags[field].trim();
      if (pendingVal && !finalizedData[field].includes(pendingVal)) {
        finalizedData[field] = [...finalizedData[field], pendingVal];
      }
    });

    try {
      await axios.put(`/api/users/${selectedUser._id}`, finalizedData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showNotification('Institutional Access Updated', 'success');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Update failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (u) => {
    setSelectedUser(u);
    setEditData({
      name: u.name,
      email: u.email,
      department: Array.isArray(u.department) ? u.department : [],
      year: Array.isArray(u.year) ? u.year : [],
      subject: Array.isArray(u.subject) ? u.subject : [],
      role: u.role,
      gender: u.gender || '',
      password: '',
      phone: u.phone || '',
      studentPhone: u.studentPhone || '',
      parentPhone: u.parentPhone || ''
    });
    setTempTags({ department: '', year: '', subject: '' });
    setShowEditModal(true);
  };

  const addTag = (field) => {
    const val = tempTags[field].trim();
    if (val && !editData[field].includes(val)) {
      setEditData(prev => ({ ...prev, [field]: [...prev[field], val] }));
      setTempTags(prev => ({ ...prev, [field]: '' }));
    }
  };

  const removeTag = (field, tag) => {
    setEditData(prev => ({ ...prev, [field]: prev[field].filter(t => t !== tag) }));
  };

  const openViewModal = (u) => {
    setSelectedUser(u);
    setShowViewModal(true);
  };

  // Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesTab = activeTab === 'All' || u.role === activeTab;
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const uDept = Array.isArray(u.department) ? u.department : (u.department ? [u.department] : []);
      const matchesDept = deptFilter ? uDept.includes(deptFilter) : true;
        
      return matchesTab && matchesSearch && matchesDept;
    });
  }, [users, activeTab, searchQuery, deptFilter]);

const stats = useMemo(() => ({
  total: users.length,
  Admin: users.filter(u => u.role === 'Admin').length,
  Principal: users.filter(u => u.role === 'Principal').length,
  VicePrincipal: users.filter(u => u.role === 'Vice-Principal').length,
  HOD: users.filter(u => u.role === 'HOD').length,
  Teacher: users.filter(u => u.role === 'Teacher').length,
  Student: users.filter(u => u.role === 'Student').length,
}), [users]);

const indexOfLastUser = currentPage * recordsPerPage;
const indexOfFirstUser = indexOfLastUser - recordsPerPage;
const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);

const paginate = (pageNumber) => setCurrentPage(pageNumber);

// Reset page when filters change
useEffect(() => {
  setCurrentPage(1);
}, [activeTab, searchQuery, deptFilter]);

const TabButton = ({ label, count, role }) => (
  <button
    onClick={() => setActiveTab(role)}
    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${activeTab === role
        ? 'bg-primary text-white border-primary shadow-lg shadow-indigo-500/20'
        : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-white'
      }`}
  >
    {label}
    <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === role ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
      }`}>
      {count}
    </span>
  </button>
);

return (
  <div className="space-y-6">
    {/* HEADER */}
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">Manage Users</h1>
        <p className="text-slate-500 text-sm mt-1 uppercase font-bold tracking-widest text-xs italic">View, Modify, and Control System Access</p>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => setShowHodModal(true)} className="btn btn-primary !px-6 !py-2.5 text-xs font-bold uppercase tracking-widest">
          + Add User / HOD
        </button>
      </div>
    </div>

    {/* TABS */}
    <div className="flex flex-wrap items-center gap-3">
      <TabButton label="All Users" count={stats.total} role="All" />
      <TabButton label="Admin" count={stats.Admin} role="Admin" />
      <TabButton label="Principal" count={stats.Principal} role="Principal" />
      <TabButton label="Vice Principal" count={stats.VicePrincipal} role="Vice-Principal" />
      <TabButton label="HODs" count={stats.HOD} role="HOD" />
      <TabButton label="Teachers" count={stats.Teacher} role="Teacher" />
      <TabButton label="Students" count={stats.Student} role="Student" />
    </div>

    {/* SEARCH AND FILTERS */}
    <div className="flex flex-col md:flex-row gap-4">
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            placeholder="Search member by name or email..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {(activeTab === 'Student' || activeTab === 'Teacher') && (
            <select 
                className="bg-slate-900/50 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/50 outline-none w-full md:w-64 cursor-pointer"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
            >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
        )}
    </div>

    {/* TABLE */}
    <div className="glass-card !p-0 overflow-hidden shadow-2xl border-slate-800/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800">
              <th className="table-header !py-4 text-[10px] tracking-[0.2em] w-12 text-center">#</th>
              <th className="table-header !py-4 text-[10px] tracking-[0.2em]">Full Identity</th>
              <th className="table-header !py-4 text-[10px] tracking-[0.2em]">Dept & Info</th>
              <th className="table-header !py-4 text-[10px] tracking-[0.2em] text-center">Membership</th>
              <th className="table-header !py-4 text-[10px] tracking-[0.2em] text-center">Safety</th>
              <th className="table-header !py-4 text-[10px] tracking-[0.2em] text-right pr-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {currentUsers.map((u, index) => (
              <tr key={u._id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="table-cell text-center font-bold text-slate-700 text-xs">{indexOfFirstUser + index + 1}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm leading-none">{u.name}</p>
                      <p className="text-[10px] text-slate-600 font-bold lowercase mt-1 tracking-tighter">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <p className="text-xs text-slate-400 font-bold">
                    {Array.isArray(u.department) ? u.department.join(', ') : (u.department || 'GLOBAL')}
                  </p>
                  <p className="text-[10px] text-slate-600 font-black uppercase mt-0.5">
                    {Array.isArray(u.year) ? u.year.join(', ') : (u.year || 'N/A')}
                  </p>
                </td>
                <td className="table-cell text-center">
                  <span className={`badge ${u.role === 'Admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>{u.role}</span>
                </td>
                <td className="table-cell text-center">
                  <span className={`badge ${u.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{u.status}</span>
                </td>
                <td className="table-cell text-right pr-8 space-x-4">
                  <button onClick={() => openViewModal(u)} className="text-slate-500 hover:text-white transition-all transform hover:scale-125 inline-block" title="View Profile">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                  <button onClick={() => openEditModal(u)} className="text-slate-500 hover:text-primary transition-all transform hover:scale-125 inline-block" title="Edit Access">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  {u.role !== 'Admin' && u.status === 'Approved' && (
                    <button onClick={() => handleStatusUpdate(u._id, 'Blocked')} className="text-slate-500 hover:text-amber-500 transition-all transform hover:scale-125 inline-block" title="Stop Access">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    </button>
                  )}
                  {u.role !== 'Admin' && u.status !== 'Approved' && (
                    <button onClick={() => handleStatusUpdate(u._id, 'Approved')} className="text-slate-500 hover:text-emerald-500 transition-all transform hover:scale-125 inline-block" title="Approve Access">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                  )}
                  {u.role !== 'Admin' && (
                    <button onClick={() => handleDeleteUser(u._id)} className="text-slate-700 hover:text-red-500 transition-all transform hover:scale-125 inline-block" title="Delete User">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredUsers.length > 0 && (
        <div className="px-8 py-6 bg-slate-900/50 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Showing <span className="text-white">{Math.min(indexOfFirstUser + 1, filteredUsers.length)}</span> - <span className="text-white">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of <span className="text-white">{filteredUsers.length}</span> Records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => currentPage > 1 && paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => paginate(pageNum)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === pageNum
                          ? 'bg-secondary text-white shadow-lg shadow-secondary/20'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="text-slate-600 px-1 text-[10px]">...</span>;
                }
                return null;
              })}
            </div>

            <button
              type="button"
              onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>

    {/* VIEW MODAL */}
    {showViewModal && selectedUser && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="glass-card w-full max-w-lg animate-in zoom-in duration-300 border-slate-700/50">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-white">Member Profile</h2>
            <button onClick={() => setShowViewModal(false)} className="text-slate-500 hover:text-white text-3xl leading-none">&times;</button>
          </div>
          <div className="flex items-center gap-6 mb-8 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
              {selectedUser.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{selectedUser.name}</h3>
              <p className="text-primary text-sm font-black uppercase tracking-widest">{selectedUser.role}</p>
              <p className="text-slate-500 text-xs mt-1 lowercase font-bold italic">{selectedUser.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800 col-span-2">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Security Credentials</p>
              <p className="text-slate-500 font-mono text-[10px] truncate max-w-full italic mt-1 pb-1 border-b border-slate-800">HASHED_AUTH_TOKEN: {selectedUser._id}</p>
              <p className="text-[9px] text-slate-700 font-bold uppercase mt-2">* Passwords are encrypted for institutional safety</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Gender Identity</p>
              <p className="text-white font-bold">{selectedUser.gender || 'Not Specified'}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Status Access</p>
              <p className={`font-bold ${selectedUser.status === 'Approved' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedUser.status}</p>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Department</p>
              <p className="text-white font-bold">{Array.isArray(selectedUser.department) ? selectedUser.department.join(', ') : (selectedUser.department || 'Global')}</p>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Academic Year</p>
              <p className="text-white font-bold">{Array.isArray(selectedUser.year) ? selectedUser.year.join(', ') : (selectedUser.year || 'N/A')}</p>
            </div>
            {(selectedUser.role === 'Student' && (selectedUser.studentPhone || selectedUser.parentPhone)) ? (
              <>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Student Mobile</p>
                  <p className="text-white font-mono font-bold tracking-wider">{selectedUser.studentPhone || 'N/A'}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Guardian Mobile</p>
                  <p className="text-white font-mono font-bold tracking-wider">{selectedUser.parentPhone || 'N/A'}</p>
                </div>
              </>
            ) : (selectedUser.phone) ? (
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 col-span-2">
                <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Personal Contact</p>
                <p className="text-white font-mono font-bold tracking-wider">{selectedUser.phone}</p>
              </div>
            ) : null}
            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800 col-span-2">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Assigned Subjects</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {Array.isArray(selectedUser.subject) && selectedUser.subject.length > 0 ? selectedUser.subject.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-[9px] font-bold uppercase">{s}</span>
                )) : <p className="text-xs text-slate-500 italic">No subjects assigned</p>}
              </div>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800 col-span-2">
              <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Created On</p>
              <p className="text-white font-bold">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <button onClick={() => setShowViewModal(false)} className="btn btn-primary w-full py-4 text-xs font-black uppercase tracking-widest">Close Dashboard</button>
        </div>
      </div>
    )}

    {/* EDIT MODAL */}
    {showEditModal && selectedUser && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-white">
        <div className="glass-card w-full max-w-lg border-slate-700/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-white">Edit System Access</h2>
            <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white text-3xl leading-none">&times;</button>
          </div>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Full Name</label>
                <input type="text" className="form-input" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Gender</label>
                <select className="form-input" value={editData.gender} onChange={e => setEditData({ ...editData, gender: e.target.value })}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Role</label>
                <select
                  className={`form-input ${user.role !== 'Admin' || editData.role === 'Principal' || editData.role === 'Vice-Principal' || editData.role === 'Admin' ? 'bg-slate-800 cursor-not-allowed text-slate-400' : 'cursor-pointer'}`}
                  value={editData.role}
                  disabled={user.role !== 'Admin' || editData.role === 'Principal' || editData.role === 'Vice-Principal' || editData.role === 'Admin'}
                  onChange={e => setEditData({ ...editData, role: e.target.value })}
                >
                  {/* Only show top roles if the user already has them (since the field is disabled anyway) */}
                  {(editData.role === 'Admin' || editData.role === 'Principal' || editData.role === 'Vice-Principal') && (
                    <>
                      <option value="Admin">Admin</option>
                      <option value="Principal">Principal</option>
                      <option value="Vice-Principal">Vice-Principal</option>
                    </>
                  )}
                  <option value="HOD">HOD</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Student">Student</option>
                </select>
                {(user.role !== 'Admin' || editData.role === 'Principal' || editData.role === 'Vice-Principal' || editData.role === 'Admin') && (
                  <p className="text-[9px] text-indigo-500/50 font-bold mt-1 uppercase italic">* Role is fixed for leadership and management positions</p>
                )}
              </div>
              <div>
                <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Email Contact</label>
                <input type="email" className="form-input text-slate-500" value={editData.email} disabled />
              </div>
            </div>
            {editData.role === 'Student' ? (
              <div className="grid grid-cols-2 gap-4">
                <PhoneInput label="Student Mobile" value={editData.studentPhone} onChange={v => setEditData({ ...editData, studentPhone: v })} />
                <PhoneInput label="Guardian Mobile" value={editData.parentPhone} onChange={v => setEditData({ ...editData, parentPhone: v })} />
              </div>
            ) : (editData.role !== 'Admin' && editData.role !== 'Principal' && editData.role !== 'Vice-Principal') ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PhoneInput label="Personal Contact" value={editData.phone} onChange={v => setEditData({ ...editData, phone: v })} />
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['department', 'year'].map(field => (
                <div key={field} className="form-group">
                  <label className="form-label text-[10px] uppercase font-black text-slate-500 tracking-widest mb-2 block flex items-center gap-2">
                    {field === 'department' ? (
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    {field}
                  </label>
                  <div className="glass-card !p-3 min-h-[80px] border-slate-800/50 flex flex-wrap gap-2 content-start group hover:border-slate-700 transition-all">
                    {editData[field].map(tag => (
                      <span key={tag} className={`flex items-center gap-2 ${field === 'department' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'} border px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider group/tag animate-in zoom-in duration-200`}>
                        {tag}
                        <button type="button" onClick={() => removeTag(field, tag)} className="hover:text-white transition-all transform hover:scale-110">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                    <div className="relative flex-1 min-w-[80px]">
                      <input
                        type="text"
                        className="w-full bg-transparent border-none outline-none text-[10px] uppercase font-bold text-white placeholder:text-slate-600 p-1.5"
                        placeholder="+ ADD"
                        value={tempTags[field]}
                        onChange={e => setTempTags({ ...tempTags, [field]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag(field);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label text-[10px] uppercase font-black text-slate-500 tracking-widest mb-2 block flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>
                Institutional Subjects
              </label>
              <div className="glass-card !p-4 min-h-[120px] max-h-[200px] overflow-y-auto custom-scrollbar border-slate-800/50 flex flex-wrap gap-2.5 content-start group hover:border-slate-700 transition-all">
                {editData.subject.map(tag => (
                  <span key={tag} className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest group/tag animate-in zoom-in duration-200 hover:bg-indigo-500/20 transition-all cursor-default">
                    {tag}
                    <button type="button" onClick={() => removeTag('subject', tag)} className="hover:text-white transition-all transform hover:scale-120">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                <div className="relative flex-1 min-w-[120px]">
                  <input
                    type="text"
                    className="w-full bg-transparent border-none outline-none text-xs uppercase font-black text-white placeholder:text-slate-600 p-2"
                    placeholder="+ REGISTER NEW SUBJECT..."
                    value={tempTags.subject}
                    onChange={e => setTempTags({ ...tempTags, subject: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag('subject');
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
              <label className="form-label text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 block flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Security Override (Password)
              </label>
              <input
                type="text"
                placeholder="Type new password to override or leave empty"
                className="form-input !py-3 !text-xs border-indigo-500/20 focus:border-indigo-500"
                value={editData.password}
                onChange={e => setEditData({ ...editData, password: e.target.value })}
              />
            </div>
            <div className="pt-6 flex gap-4">
              <button type="button" onClick={() => setShowEditModal(false)} className="btn bg-slate-800 text-slate-500 flex-1 uppercase text-xs font-black tracking-widest">Discard</button>
              <button type="submit" disabled={isProcessing} className="btn btn-primary flex-1 uppercase text-xs font-black tracking-widest">
                {isProcessing ? 'Saving Changes...' : 'Save Member Access'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* PROVISION ACCESS MODAL */}
    {showHodModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md text-white">
        <div className="glass-card w-full max-w-lg border-slate-700/50 flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-white">Provision Access</h3>
            <button onClick={() => setShowHodModal(false)} className="text-slate-500 hover:text-white text-3xl leading-none">&times;</button>
          </div>
          <form onSubmit={handleProvisionUser} className="space-y-4 overflow-y-auto custom-scrollbar p-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Name</label>
                <input type="text" required className="form-input" value={provisionData.name} onChange={e => setProvisionData({ ...provisionData, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Role</label>
                <select required className="form-input" value={provisionData.role} onChange={e => setProvisionData({ ...provisionData, role: e.target.value, department: e.target.value === 'Admin' ? '' : provisionData.department })}>
                  <option value="Admin">Admin</option>
                  <option value="HOD">HOD</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Email</label>
              <input type="email" required className="form-input" value={provisionData.email} onChange={e => setProvisionData({ ...provisionData, email: e.target.value })} />
            </div>
            <div>
              <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Initial Security Password</label>
              <input type="password" required className="form-input" value={provisionData.password} onChange={e => setProvisionData({ ...provisionData, password: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className={provisionData.role === 'Admin' ? 'opacity-50' : ''}>
                <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block flex justify-between">Target Domain <span className="lowercase text-[8px] font-bold text-slate-600">(Req. for HOD)</span></label>
                <select 
                  disabled={provisionData.role === 'Admin'} 
                  required={provisionData.role === 'HOD'} 
                  className="form-input" 
                  value={provisionData.department} 
                  onChange={e => setProvisionData({ ...provisionData, department: e.target.value })}
                >
                  <option value="">{provisionData.role === 'Admin' ? "Global Access" : "Select Dept"}</option>
                  {provisionData.role !== 'Admin' && DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Gender</label>
                <select required className="form-input" value={provisionData.gender} onChange={e => setProvisionData({ ...provisionData, gender: e.target.value })}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button type="button" onClick={() => setShowHodModal(false)} className="btn bg-slate-800 text-slate-500 flex-1 uppercase text-xs font-black tracking-widest">Cancel</button>
              <button type="submit" disabled={isProcessing} className="btn btn-primary flex-1 uppercase text-xs font-black tracking-widest">
                {isProcessing ? 'Processing...' : 'Confirm Provisioning'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
};

export default Users;
