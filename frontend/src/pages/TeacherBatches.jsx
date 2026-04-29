import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const TeacherBatches = () => {
   const [batches, setBatches] = useState([]);
   const { user, refreshUser } = useContext(AuthContext);
   const { showNotification } = useNotification();
  const [activeBatch, setActiveBatch] = useState(null);
  
  // Lecture Mode State
  const [isLectureMode, setIsLectureMode] = useState(false);
  const [lectureForm, setLectureForm] = useState({ department: '', year: '', subject: '' });
  const [lectureStudents, setLectureStudents] = useState([]);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);

  // Common Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    sessionType: 'Lecture'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBatches = async () => {
    try {
      const { data } = await axios.get('/api/batches', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setBatches(data);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  useEffect(() => {
    if (user && user.token) {
      refreshUser();
      fetchBatches();
    }
  }, []);

  // Handle Fetching Students for Lecture Mode
  useEffect(() => {
    const fetchClassStudents = async () => {
      // Require Dept and Subject (Year is now optional)
      if (!lectureForm.department || !lectureForm.subject) {
        setLectureStudents([]);
        return;
      }
      
      setIsFetchingStudents(true);
      try {
        const { data } = await axios.get('/api/users/students-by-class', {
          params: { 
            department: lectureForm.department, 
            year: lectureForm.year,
            subject: lectureForm.subject 
          },
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setLectureStudents(data);
        
        // Initialize records
        const initial = {};
        data.forEach(s => initial[s._id] = 'Present');
        setAttendanceRecords(initial);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setIsFetchingStudents(false);
      }
    };

    if (isLectureMode) fetchClassStudents();
  }, [lectureForm.department, lectureForm.year, lectureForm.subject, isLectureMode, user.token]);

  const handleSelectBatch = (batch) => {
    setActiveBatch(batch);
    setAttendanceForm(prev => ({ 
      ...prev, 
      sessionType: 'Practical',
      date: new Date().toISOString().split('T')[0]
    }));
    const initialRecords = {};
    batch.students.forEach(student => {
      initialRecords[student._id] = 'Present';
    });
    setAttendanceRecords(initialRecords);
  };

  const toggleStudentStatus = (studentId) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const submitAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceForm.time) return showNotification("Select Session Time", 'error');
    if (isLectureMode && !lectureForm.subject) return showNotification("Select Subject", 'error');
    
    setIsSubmitting(true);
    const payload = {
      batchId: isLectureMode ? null : activeBatch._id,
      date: attendanceForm.date,
      time: attendanceForm.time,
      sessionType: attendanceForm.sessionType,
      subject: isLectureMode ? lectureForm.subject : undefined,
      department: isLectureMode ? lectureForm.department : undefined,
      year: isLectureMode ? lectureForm.year : undefined,
      records: Object.keys(attendanceRecords).map(studentId => ({
        student: studentId,
        status: attendanceRecords[studentId]
      }))
    };

    try {
       await axios.post('/api/attendance', payload, {
         headers: { Authorization: `Bearer ${user.token}` }
       });
       showNotification('Institutional Attendance Recorded Actually!', 'success');
       setActiveBatch(null);
       setIsLectureMode(false);
     } catch (error) {
       showNotification(error.response?.data?.message || 'Submission failed', 'error');
     } finally {
       setIsSubmitting(false);
     }
  };

  // UI Components
  if (activeBatch || isLectureMode) {
    const studentsSource = isLectureMode ? lectureStudents : activeBatch.students;
    const title = isLectureMode ? "Class Lecture Roster" : "Batch Roster";
    const subTitle = isLectureMode 
      ? `${lectureForm.department}${lectureForm.year ? ` | ${lectureForm.year}` : ''}${lectureForm.subject ? ` | ${lectureForm.subject}` : ' | SELECT SUBJECT'}` 
      : `${activeBatch.batchName} | ${activeBatch.subject}`;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Mark Attendance</h1>
            <p className="text-sm font-bold text-primary uppercase mt-1 tracking-widest">{subTitle}</p>
          </div>
          <button 
            onClick={() => { setActiveBatch(null); setIsLectureMode(false); }} 
            className="btn bg-slate-800 text-white !px-4 !py-2 text-sm font-bold"
          >
            Exit Roster
          </button>
        </div>

        <form onSubmit={submitAttendance} className="space-y-6">
           {/* Selections Grid */}
           <div className="glass-card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="form-group">
                 <label className="form-label text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 block">Date</label>
                 <input 
                   type="date" 
                   required 
                   max={new Date().toISOString().split('T')[0]}
                   className="form-input" 
                   value={attendanceForm.date} 
                   onChange={e => setAttendanceForm({...attendanceForm, date: e.target.value})} 
                 />
              </div>
              <div className="form-group">
                 <label className="form-label text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 block">Time</label>
                 <input type="time" required className="form-input" value={attendanceForm.time} onChange={e => setAttendanceForm({...attendanceForm, time: e.target.value})} />
              </div>
              <div className="form-group">
                 <label className="form-label text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 block">Session Type</label>
                 <select 
                   className="form-input" 
                   value={attendanceForm.sessionType} 
                   onChange={e => setAttendanceForm({...attendanceForm, sessionType: e.target.value})}
                 >
                   {isLectureMode ? (
                     <option value="Lecture">Regular Lecture</option>
                   ) : (
                     <option value="Practical">Practical Lab</option>
                   )}
                 </select>
              </div>

              {/* LECTURE FILTERS */}
              {isLectureMode && (
                <>
                  <div className="form-group">
                     <label className="form-label text-[10px] uppercase font-bold text-indigo-500 tracking-widest mb-1 block">Department</label>
                     <select className="form-input border-indigo-500/20" value={lectureForm.department} onChange={e => setLectureForm({...lectureForm, department: e.target.value})}>
                        <option value="">Select Domain</option>
                        {user.department?.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>
                  <div className="form-group">
                     <label className="form-label text-[10px] uppercase font-bold text-indigo-500 tracking-widest mb-1 block">Year</label>
                     <select className="form-input border-indigo-500/20" value={lectureForm.year} onChange={e => setLectureForm({...lectureForm, year: e.target.value})}>
                        <option value="">Select Year</option>
                        {user.year?.map(y => <option key={y} value={y}>{y}</option>)}
                     </select>
                  </div>
                  <div className="form-group">
                     <label className="form-label text-[10px] uppercase font-bold text-indigo-500 tracking-widest mb-1 block">Subject</label>
                     <select className="form-input border-indigo-500/20" value={lectureForm.subject} onChange={e => setLectureForm({...lectureForm, subject: e.target.value})}>
                        <option value="">Select Subject</option>
                        {user.subject?.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </div>
                </>
              )}
           </div>

          {/* Student List */}
          <div className="glass-card !p-0 overflow-hidden shadow-2xl border-slate-800/50">
            <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
              <h3 className="font-bold text-white uppercase text-xs tracking-widest flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary pulse"></div>
                 {title} ({studentsSource.length})
              </h3>
              {isFetchingStudents && <span className="text-xs text-primary animate-pulse font-bold uppercase tracking-widest">Fetching...</span>}
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-900 z-10 text-[10px] uppercase text-slate-500 tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">Student Identity</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {studentsSource.map(student => (
                    <tr key={student._id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-white text-sm">
                        <div className="flex items-center gap-3">
                           <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-primary font-black border border-slate-700/50">
                              {student.rollNumber || '0'}
                           </span>
                           <span>{student.name}</span>
                        </div>
                        <div className="flex gap-2 items-center mt-1 ml-11">
                          <span className="text-[9px] text-slate-700 font-medium italic lowercase">{student.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${attendanceRecords[student._id] === 'Present' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                           {attendanceRecords[student._id]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          type="button" 
                          onClick={() => toggleStudentStatus(student._id)} 
                          className={`btn !py-1.5 !px-4 text-[10px] uppercase font-black tracking-widest border transition-all ${
                            attendanceRecords[student._id] === 'Present' 
                              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {attendanceRecords[student._id] === 'Present' ? 'Absent' : 'Present'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {studentsSource.length === 0 && !isFetchingStudents && (
                    <tr><td colSpan="3" className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">No Students localized for this selection.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-slate-900/50 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] italic">* ENSURE ALL DATA IS VERIFIED BEFORE SUBMISSION</p>
              <button 
                type="submit" 
                disabled={isSubmitting || studentsSource.length === 0} 
                className="btn btn-primary min-w-[250px] !py-4 text-xs tracking-[0.2em] font-black uppercase shadow-indigo-500/20 shadow-2xl hover:scale-105 transition-all"
              >
                {isSubmitting ? 'Finalizing Sync...' : 'Confirm and Submit Attendance'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Attendance Portals</h1>
          <p className="text-slate-500 text-sm mt-1 font-bold uppercase tracking-widest text-xs italic">Select Operational Mode to Initiate Tracking</p>
        </div>
        <button 
          onClick={() => {
            setIsLectureMode(true);
            setAttendanceForm(prev => ({ ...prev, sessionType: 'Lecture' }));
          }} 
          className="btn btn-primary !px-8 !py-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/10"
        >
          + Start General Lecture
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map(b => (
          <div key={b._id} className="glass-card flex flex-col hover:border-primary/50 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-500">
               <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
               <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-inner">
                  <span className="text-xl font-black">{b.batchName.charAt(0)}</span>
               </div>
               <div>
                 <h2 className="text-xl font-bold text-white truncate max-w-[150px]">{b.batchName}</h2>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{b.department}</p>
               </div>
            </div>
            
            <div className="space-y-4 mb-8 relative z-10">
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-500 font-bold uppercase tracking-widest">Module</span>
                 <span className="text-slate-200 font-black">{b.subject}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-500 font-bold uppercase tracking-widest">Academic Year</span>
                 <span className="text-slate-200 font-black italic">{b.year}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                 <span className="text-slate-500 font-black uppercase text-[9px] tracking-[0.3em]">Authorized Strength</span>
                 <span className="text-primary font-black text-sm tracking-widest">{b.students?.length || 0}</span>
              </div>
            </div>

            <button 
              onClick={() => handleSelectBatch(b)} 
              className="btn btn-primary w-full py-3 text-xs font-black uppercase tracking-widest mt-auto group-hover:shadow-indigo-500/20 shadow-lg transition-all"
            >
              Access Roster
            </button>
          </div>
        ))}
        {batches.length === 0 && (
          <div className="col-span-full py-20 bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-800/50 flex flex-col items-center justify-center text-center">
             <div className="text-slate-800 mb-6 scale-150">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <p className="text-slate-600 max-w-sm font-bold uppercase tracking-widest text-xs leading-loose italic">No Batch Clusters Authenticated. Please coordinate with Central Administration for subject enrollment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherBatches;
