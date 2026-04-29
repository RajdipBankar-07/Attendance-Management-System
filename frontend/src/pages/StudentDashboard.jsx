import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const StudentDashboard = () => {
  const [attendance, setAttendance] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('All');
  const recordsPerPage = 10;
  const { user } = useContext(AuthContext);

  const fetchAttendance = async () => {
    try {
      const { data } = await axios.get('/api/attendance/student', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setAttendance(data);
      setCurrentPage(1); // Reset to first page on fetch
    } catch (error) {
      console.error('Error fetching student attendance:', error);
    }
  };

  useEffect(() => {
    if (user && user.token) fetchAttendance();
  }, [user]);

  // Analytics calculation
  const stats = React.useMemo(() => {
    const subjects = {};
    attendance.forEach(record => {
      const subj = record.batch?.subject || 'N/A';
      if (!subjects[subj]) subjects[subj] = { total: 0, present: 0 };
      subjects[subj].total += 1;
      if (record.status === 'Present') subjects[subj].present += 1;
    });

    const summary = Object.keys(subjects).map(s => ({
      name: s,
      ...subjects[s],
      percentage: Math.round((subjects[s].present / subjects[s].total) * 100)
    }));

    const overallTotal = summary.reduce((acc, s) => acc + s.total, 0);
    const overallPresent = summary.reduce((acc, s) => acc + s.present, 0);
    const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;
    
    // Check for today's absences (YYYY-MM-DD comparison)
    const today = new Date().toLocaleDateString('en-CA'); 
    const todayAbsences = attendance.filter(a => {
      const recordDate = new Date(a.date).toLocaleDateString('en-CA');
      return recordDate === today && a.status === 'Absent';
    }).length;

    return { summary, overallPercentage, todayAbsences };
  }, [attendance]);

  const filteredAttendance = React.useMemo(() => {
    if (filterStatus === 'All') return attendance;
    return attendance.filter(a => a.status === filterStatus);
  }, [attendance, filterStatus]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Today's Absence Notification */}
      {stats.todayAbsences > 0 && (
        <div className="bg-rose-600 px-8 py-5 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-rose-600/30 animate-pulse border-4 border-rose-500/50">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div>
              <h4 className="text-xl font-black text-white tracking-tight italic">Missed Session Alert!</h4>
              <p className="text-rose-100 text-sm font-bold">You were marked <span className="underline decoration-white/40">Absent</span> for {stats.todayAbsences} session(s) today. Please verify with your teacher.</p>
            </div>
          </div>
          <button 
             onClick={() => { setFilterStatus('Absent'); setCurrentPage(1); }}
             className="bg-white text-rose-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-50 transition-all shadow-xl"
          >
            Review Absences
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tighter">My Progress</h1>
          <p className="text-slate-400 mt-2 text-sm max-w-sm">Detailed breakdown of your session-wise attendance and academic participation</p>
        </div>
        
        {/* Overall Stat Card */}
        <div className="glass-card !py-4 !px-8 border-primary/30 bg-primary/10 flex items-center gap-6 shadow-indigo-500/10">
           <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                 <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                 <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" 
                         strokeDasharray={2 * Math.PI * 34} 
                         strokeDashoffset={2 * Math.PI * 34 * (1 - stats.overallPercentage / 100)}
                         className={stats.overallPercentage < 75 ? 'text-red-500' : 'text-primary'} 
                 />
              </svg>
              <span className="absolute text-lg font-black text-white">{stats.overallPercentage}%</span>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Cumulative Record</p>
              <h3 className="text-2xl font-bold text-white">Full Status</h3>
           </div>
        </div>
      </div>

      {/* Warning Banner */}
      {stats.overallPercentage < 75 && stats.overallPercentage > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 animate-pulse shadow-xl shadow-red-500/5">
           <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
           </div>
           <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight">Critical Attendance Warning</h3>
              <p className="text-slate-400 text-sm max-w-xl">Your current attendance is below the institutional requirement of 75%. Please contact your respective subject coordinators as soon as possible to avoid academic penalties.</p>
           </div>
           <button className="btn bg-red-500 text-white !px-8 py-3 ml-auto font-bold uppercase text-xs tracking-widest shadow-red-500/20 shadow-lg hover:scale-105">Take Action</button>
        </div>
      )}

      {/* Subject Wise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.summary.map((s, idx) => (
          <div key={idx} className="glass-card flex flex-col hover:border-slate-600 transition-all duration-300">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-lg font-bold text-white leading-tight">{s.name}</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Academic Track</p>
                </div>
                <div className={`badge ${s.percentage < 75 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                   {s.percentage < 75 ? 'At Risk' : 'Healthy'}
                </div>
             </div>
             
             <div className="flex items-end justify-between gap-4 mt-auto">
                <div className="flex-1">
                   <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2 px-1">
                      <span>{s.present} of {s.total} Sessions</span>
                      <span>{s.percentage}%</span>
                   </div>
                   <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${s.percentage < 75 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(79,70,229,0.5)]'}`}
                        style={{ width: `${s.percentage}%` }}
                      ></div>
                   </div>
                </div>
                <div className="text-3xl font-black text-white tracking-tighter">{s.percentage}%</div>
             </div>
          </div>
        ))}
        {stats.summary.length === 0 && (
           <div className="col-span-full py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-center opacity-50">
             <p className="text-slate-500 max-w-xs font-bold uppercase tracking-widest text-xs">Awaiting session-wise record synchronization...</p>
           </div>
        )}
      </div>

      {/* RECENT RECORDS */}
      <div className="glass-card !p-0 overflow-hidden shadow-2xl transition-all duration-500">
        <div className="p-8 border-b border-slate-800 bg-slate-900/40 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Session History</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Detailed track of every academic engagement</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-950/40 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => { setFilterStatus('All'); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'All' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              All Records
            </button>
            <button 
              onClick={() => { setFilterStatus('Absent'); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'Absent' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              Absent Only
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/20">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Subject Name</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Session Type</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Observation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredAttendance.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage).map((record, i) => (
                <tr key={i} className="hover:bg-slate-800/10 transition-all group">
                  <td className="px-8 py-6">
                    <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">{new Date(record.date).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{record.time}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-slate-300 font-bold tracking-tight">{record.batch?.subject || record.subject || 'N/A'}</p>
                  </td>
                  <td className="px-8 py-6">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                       {record.sessionType}
                     </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      record.status === 'Present' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredAttendance.length === 0 && (
                <tr>
                   <td colSpan="4" className="p-20 text-center text-slate-600 italic font-black uppercase text-[10px] tracking-widest">
                      No matching records discovered for the current filter.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredAttendance.length > recordsPerPage && (
          <div className="px-8 py-6 bg-slate-900/50 border-t border-slate-800/50 flex justify-between items-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">
               Displaying <span className="text-white">{filteredAttendance.length}</span> Records | Page {currentPage}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20 transition-all border border-slate-700"
              >
                Prev
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredAttendance.length / recordsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredAttendance.length / recordsPerPage)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20 transition-all border border-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
