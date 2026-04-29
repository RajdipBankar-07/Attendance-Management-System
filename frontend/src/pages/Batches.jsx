import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const DEPARTMENTS = ['CSE', 'IT', 'E&TC', 'MECH', 'CIVIL', 'ELECT', 'AIDS'];
const YEARS = ['F.Y', 'S.Y', 'T.Y', 'Final Year'];

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const { user } = useContext(AuthContext);
  const { showNotification } = useNotification();
  
  const [newBatch, setNewBatch] = useState({
    department: '',
    year: '',
    subject: '',
    batchName: '',
    teacherId: '',
    initialStudents: []
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dashboard Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const fetchData = async () => {
    try {
      const batchRes = await axios.get('/api/batches', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setBatches(batchRes.data);

      const userRes = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setTeachers(userRes.data.filter(u => u.role === 'Teacher' && u.status === 'Approved'));
      setAllStudents(userRes.data.filter(u => u.role === 'Student' && u.status === 'Approved'));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (user && user.token) fetchData();
  }, [user]);

  // Filtering Logic for Modal
  const filteredTeachers = useMemo(() => {
    if (!newBatch.department) return teachers;
    return teachers.filter(t => t.department.includes(newBatch.department));
  }, [newBatch.department, teachers]);

  const relevantStudents = useMemo(() => {
    if (!newBatch.department || !newBatch.year) return [];
    
    return allStudents.filter(s => {
      const isDeptMatch = s.department === newBatch.department;
      const isYearMatch = s.year === newBatch.year;
      if (!isDeptMatch || !isYearMatch) return false;

      // EXCLUSION LOGIC: 
      // If a subject is entered, hide students already enrolled in ANY batch for that subject.
      if (newBatch.subject.trim()) {
        const isAlreadyEnrolledInSubject = batches.some(b => 
          b.subject.trim().toLowerCase() === newBatch.subject.trim().toLowerCase() && 
          b.students.some(stu => stu._id === s._id)
        );
        if (isAlreadyEnrolledInSubject) return false;
      }

      return true;
    });
  }, [newBatch.department, newBatch.year, newBatch.subject, allStudents, batches]);

  const handleStudentToggle = (id) => {
    setNewBatch(prev => {
        const current = prev.initialStudents;
        if (current.includes(id)) {
            return { ...prev, initialStudents: current.filter(cid => cid !== id) };
        }
        return { ...prev, initialStudents: [...current, id] };
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
        setNewBatch(prev => ({ ...prev, initialStudents: relevantStudents.map(s => s._id) }));
    } else {
        setNewBatch(prev => ({ ...prev, initialStudents: [] }));
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();

    // Client-side quick check
    const isDuplicate = batches.some(b => 
        b.department === newBatch.department &&
        b.year === newBatch.year &&
        b.subject.toLowerCase() === newBatch.subject.trim().toLowerCase() &&
        b.batchName.toLowerCase() === newBatch.batchName.trim().toLowerCase()
    );

    if (isDuplicate) {
        showNotification(`The batch "${newBatch.batchName}" already exists for this subject.`, 'error');
        return;
    }

    setIsProcessing(true);
    try {
      await axios.post('/api/batches', newBatch, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showNotification('Academic Track established!', 'success');
      setShowCreateModal(false);
      setNewBatch({ department: '', year: '', subject: '', batchName: '', teacherId: '', initialStudents: [] });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to establish track', 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteBatch = async (id) => {
    if (!window.confirm("Permanent Action: Are you sure you want to dismantle this academic track?")) return;
    try {
        await axios.delete(`/api/batches/${id}`, {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        showNotification('Track successfully dismantled', 'success');
        fetchData();
    } catch (error) {
        showNotification('Authorization error or network failure', 'error');
    }
  };

  const handleEditBatch = (batch) => {
    setEditBatch(batch);
    setNewBatch({
      department: batch.department,
      year: batch.year,
      subject: batch.subject,
      batchName: batch.batchName,
      teacherId: batch.teacher?._id || '',
      initialStudents: batch.students?.map(s => s._id) || []
    });
    setShowCreateModal(true);
  };

  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await axios.put(`/api/batches/${editBatch._id}`, newBatch, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showNotification('Academic Track updated!', 'success');
      setShowCreateModal(false);
      setEditBatch(null);
      setNewBatch({ department: '', year: '', subject: '', batchName: '', teacherId: '', initialStudents: [] });
      fetchData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Update failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const groupedBatches = useMemo(() => {
    const groups = {};
    
    // Hide all batches by default until both filters are explicitly selected
    if (!filterDept || !filterYear) {
       return groups;
    }
    
    // Apply UI Filters first
    const visibleBatches = batches.filter(b => {
       if (filterDept && b.department !== filterDept) return false;
       if (filterYear && b.year !== filterYear) return false;
       return true;
    });

    visibleBatches.forEach(b => {
      const teacherName = b.teacher ? b.teacher.name : 'Unassigned';
      if (!groups[teacherName]) groups[teacherName] = [];
      groups[teacherName].push(b);
    });
    return groups;
  }, [batches, filterDept, filterYear]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Academic Roster</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2 italic">Institutional track management & enrollment hub</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn bg-secondary hover:bg-emerald-600 text-white flex items-center gap-4 px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-secondary/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Establish New Batch
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800">
          <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Filter by Department</label>
              <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-sm font-semibold text-slate-300 focus:border-secondary focus:ring-1 focus:ring-secondary/50 outline-none transition-all" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                  <option value="">All Departments ✦</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
          </div>
          <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Filter by Year</label>
              <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-sm font-semibold text-slate-300 focus:border-secondary focus:ring-1 focus:ring-secondary/50 outline-none transition-all" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                  <option value="">All Academic Years ✦</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {Object.keys(groupedBatches).length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center p-16 text-slate-500 border-dashed border-slate-700/50 bg-slate-900/40">
             <div className="w-20 h-20 rounded-[2rem] bg-slate-800/80 flex items-center justify-center mb-6 shadow-xl border border-slate-700">
                 <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
             </div>
             <p className="text-2xl font-black text-white italic tracking-tighter mb-3">Select Filters to View Batches</p>
             <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Please choose a Department and Year above to load the academic roster.</p>
          </div>
        ) : (
          Object.keys(groupedBatches).map(teacher => (
            <div key={teacher} className="glass-card !p-0 overflow-hidden border-slate-800/40 group">
              <div className="bg-slate-900/60 p-8 border-b border-slate-800 flex justify-between items-center group-hover:bg-slate-900 transition-colors">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-[20px] bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shadow-2xl">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tighter italic">Instructor: {teacher}</h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Authorized Instructional Faculty</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedBatches[teacher].map(b => (
                      <div key={b._id} className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800 hover:border-secondary/40 transition-all group/card">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h3 className="text-2xl font-black text-white italic tracking-tighter">{b.batchName}</h3>
                                  <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mt-1">{b.subject}</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleEditBatch(b)} className="p-2 text-slate-600 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteBatch(b._id)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                          </div>
                          <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                              <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.students?.length || 0} Registered</span>
                              </div>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{b.department} | {b.year}</span>
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CASCADING CREATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-3xl font-black text-white tracking-tight">{editBatch ? 'Modify Academic Track' : 'Establish New Batch'}</h3>
              <button onClick={() => { setShowCreateModal(false); setEditBatch(null); }} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 transition-all text-2xl font-black">&times;</button>
            </div>
            
            <form onSubmit={editBatch ? handleUpdateBatch : handleCreateBatch} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 max-h-[70vh] overflow-y-auto">
              {/* Left Column: Config */}
              <div className="space-y-8">
                <div className="form-group">
                    <label className="form-label text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-3 block">Batch Designation (e.g. T1, B2)</label>
                    <input required type="text" className="form-input !p-5" placeholder="T1" value={newBatch.batchName} onChange={e => setNewBatch({...newBatch, batchName: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="form-label text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-3 block">Department</label>
                        <select required className="form-input !p-5" value={newBatch.department} onChange={e => setNewBatch({...newBatch, department: e.target.value, initialStudents: [], teacherId: ''})}>
                            <option value="">Select Dept</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-3 block">Year</label>
                        <select required className="form-input !p-5" value={newBatch.year} onChange={e => setNewBatch({...newBatch, year: e.target.value, initialStudents: []})}>
                            <option value="">Select Year</option>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-3 block">Subject Track</label>
                    <input required type="text" className="form-input !p-5" placeholder="Logic Design" value={newBatch.subject} onChange={e => setNewBatch({...newBatch, subject: e.target.value})} />
                </div>

                <div className="form-group">
                    <label className="form-label text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-3 block">Primary Instructor</label>
                    <select required className="form-input !p-5" value={newBatch.teacherId} onChange={e => setNewBatch({...newBatch, teacherId: e.target.value})}>
                        <option value="">Select Instructor...</option>
                        {filteredTeachers.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                        {filteredTeachers.length === 0 && <option disabled>No teachers in {newBatch.department || 'this dept'}</option>}
                    </select>
                </div>
              </div>

              {/* Right Column: Enrollment */}
              <div className="bg-slate-950/40 rounded-[2rem] border border-slate-800 p-8 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Batch Enrollment Hub</h4>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-secondary focus:ring-secondary" onChange={handleSelectAll} checked={relevantStudents.length > 0 && newBatch.initialStudents.length === relevantStudents.length}/>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select All</span>
                    </label>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {relevantStudents.map(s => (
                        <div key={s._id} onClick={() => handleStudentToggle(s._id)} className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${newBatch.initialStudents.includes(s._id) ? 'bg-secondary/10 border-secondary/40' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
                            <div className={`w-3 h-3 rounded-full ${newBatch.initialStudents.includes(s._id) ? 'bg-secondary shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
                            <div>
                                <p className="text-xs font-bold text-white">{s.name}</p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Roll No: {s.rollNumber}</p>
                            </div>
                        </div>
                    ))}
                    {relevantStudents.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-loose">
                                 Select Department & Year <br/> to display student roster
                             </p>
                        </div>
                    )}
                </div>
              </div>

              <div className="md:col-span-2 flex gap-6 pt-6 border-t border-slate-800">
                <button type="submit" disabled={isProcessing} className="flex-1 btn bg-secondary text-white !py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-secondary/20 disabled:opacity-50">
                    {isProcessing ? 'SYNCHRONIZING Institutional Data...' : (editBatch ? 'UPDATE ACADEMIC TRACK' : 'ESTABLISH ACADEMIC TRACK')}
                </button>
                <button type="button" onClick={() => { setShowCreateModal(false); setEditBatch(null); }} className="px-10 py-5 rounded-3xl bg-slate-800 text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-slate-700 transition-all">Discard</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Batches;
