import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Announcements = () => {
  const { user } = useContext(AuthContext);
  const { showNotification, confirmAction } = useNotification();

  const [announcements, setAnnouncements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcasts'); // 'broadcasts' | 'logs'

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('All');
  const [targetEmail, setTargetEmail] = useState('');
  
  const canPost = ['Admin', 'Principal', 'Vice-Principal', 'HOD', 'Teacher'].includes(user?.role);
  const canSeeLogs = ['Admin', 'Principal', 'Vice-Principal'].includes(user?.role);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/announcements', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setAnnouncements(data);
    } catch (error) {
      showNotification('Failed to fetch announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!canSeeLogs) return;
    try {
      const { data } = await axios.get('/api/audit', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Filter for communication related logs
      const commLogs = data.filter(l => ['BROADCAST_MESSAGE', 'RETRACT_MESSAGE'].includes(l.action));
      setAuditLogs(commLogs);
    } catch (e) {
      console.error('Audit fetch error');
    }
  };

  useEffect(() => {
    if (user && user.token) {
      fetchAnnouncements();
      if (canSeeLogs) fetchLogs();
    }
  }, [user]);

  const handlePost = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        message,
        targetRole,
        targetUser: targetEmail 
      };
      
      await axios.post('/api/announcements', payload, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      showNotification('Signal transmitted across the network!', 'success');
      setTitle('');
      setMessage('');
      setTargetRole('All');
      setTargetEmail('');
      fetchAnnouncements();
      fetchLogs();
    } catch (error) {
       showNotification(error.response?.data?.message || 'Transmission failed', 'error');
    }
  };

  const handleDelete = async (ann) => {
     const isCreator = ann.createdBy._id === user._id;
     const isAdmin   = ['Admin', 'Principal', 'Vice-Principal'].includes(user.role);
     
     const titleText = (isCreator || isAdmin) ? 'Retract Broadcast' : 'Dismiss Message';
     const descText  = (isCreator || isAdmin) 
        ? 'Delete this alert for ALL recipients permanently?' 
        : 'Remove this message from your personal inbox?';

     confirmAction(titleText, descText, async () => {
       try {
         await axios.delete(`/api/announcements/${ann._id}`, {
           headers: { Authorization: `Bearer ${user.token}` }
         });
         showNotification((isCreator || isAdmin) ? 'Broadcast Retracted.' : 'Message Dismissed.', 'success');
         fetchAnnouncements();
         fetchLogs();
       } catch (error) {
         showNotification('Action failed', 'error');
       }
     });
  };

  const handleDeleteLog = async (logId) => {
    confirmAction('Delete Log entry', 'Permanently remove this communication log from history?', async () => {
      try {
        await axios.delete(`/api/audit/${logId}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        showNotification('Log entry removed.', 'success');
        fetchLogs();
      } catch (error) {
        showNotification('Failed to delete log', 'error');
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">
            Institutional <span className="text-secondary italic">Communication Hub</span>
          </h1>
          <p className="text-slate-400 font-medium">Coordinate directly with faculty and leadership across the network.</p>
        </div>

        {canSeeLogs && (
          <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setActiveTab('broadcasts')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'broadcasts' ? 'bg-secondary text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Live Signals
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-secondary text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
            >
              History Logs
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
         
         {/* LEFT COLUMN: List or Logs */}
         <div className="lg:col-span-2 space-y-4">
             {activeTab === 'broadcasts' ? (
                <>
                  <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-4 text-[11px] opacity-40">Active Institutional Signals</h2>
                  {loading && <div className="text-center text-slate-500 py-10 font-bold uppercase tracking-widest text-xs">Scanning Frequencies...</div>}
                  {!loading && announcements.length === 0 && (
                      <div className="glass-card text-center py-20 border-slate-800/50">
                          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No Active Transmissions Found</p>
                      </div>
                  )}
                  <div className="space-y-4">
                      {announcements.map(ann => (
                          <div key={ann._id} className="bg-slate-900/60 border border-slate-800 hover:border-secondary/40 rounded-[2rem] p-8 relative group transition-all duration-300">
                              <div className="flex justify-between items-start mb-6">
                                  <div>
                                      <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">{ann.title}</h3>
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            By {ann.createdBy.name} · {ann.createdBy.role}
                                        </p>
                                      </div>
                                  </div>
                                  <button onClick={() => handleDelete(ann)} className="bg-slate-950 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 p-3 rounded-2xl transition-all border border-slate-800 group-hover:border-rose-500/20" title={ann.createdBy._id === user._id ? 'Retract for All' : 'Dismiss for Me'}>
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                              </div>
                              <div className="p-6 bg-slate-950/40 rounded-3xl border border-slate-800/30 mb-6">
                                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{ann.message}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-5 justify-between pt-4 border-t border-slate-800/50">
                                 <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Recipient:</span>
                                    <span className="px-3 py-1 bg-slate-800 rounded-full text-[9px] font-black text-secondary uppercase tracking-widest border border-secondary/10">
                                       {ann.targetUser ? ann.targetUser.name : ann.targetRole}
                                    </span>
                                 </div>
                                 <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest tabular-nums">
                                    {new Date(ann.createdAt).toLocaleString()}
                                 </span>
                              </div>
                          </div>
                      ))}
                  </div>
                </>
             ) : (
                <>
                  <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-4 text-[11px] opacity-40">Institutional Activity Log</h2>
                  <div className="space-y-3">
                      {auditLogs.map(log => (
                          <div key={log._id} className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 group hover:bg-slate-900/60 transition-colors">
                              <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${log.action === 'BROADCAST_MESSAGE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                      {log.action === 'BROADCAST_MESSAGE' 
                                        ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15L4 14a1 1 0 010-2l1.586-1L7 10.143V14.857L5.586 15z" /></svg>
                                        : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                      }
                                  </div>
                                  <div>
                                      <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">
                                         {log.action.replace('_', ' ')}: <span className="opacity-60">{log.details.title}</span>
                                      </p>
                                      <p className="text-[10px] font-bold text-slate-500">
                                         By {log.performedBy.name} · {new Date(log.timestamp).toLocaleString()}
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <div className="hidden sm:block text-right">
                                      <span className="px-3 py-1 bg-slate-800 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] border border-slate-700">
                                         SECURE_LOG
                                      </span>
                                  </div>
                                  <button 
                                      onClick={() => handleDeleteLog(log._id)}
                                      className="text-slate-600 hover:text-red-400 p-2 rounded-lg transition-colors"
                                      title="Delete Log Permanently"
                                  >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                              </div>
                          </div>
                      ))}
                      {auditLogs.length === 0 && <div className="text-center py-20 text-slate-600 font-bold uppercase tracking-widest text-[10px]">Log environment is empty.</div>}
                  </div>
                </>
             )}
         </div>

         {/* RIGHT COLUMN: Create Form */}
         {canPost && (
             <div className="glass-card shadow-2xl sticky top-8 border-secondary/20 !p-8">
                 <div className="mb-8">
                    <h2 className="text-2xl font-black text-white italic tracking-tighter mb-1">Initialize Broadcast</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Institutional Override</p>
                 </div>
                 
                 <form onSubmit={handlePost} className="space-y-6">
                     <div className="form-group">
                         <label className="form-label text-[10px] font-black uppercase tracking-[0.2em] mb-3 block text-slate-500">Broadcast Signal Title</label>
                         <input required type="text" className="form-input bg-slate-950 !py-4 border-slate-800" value={title} onChange={e => setTitle(e.target.value)} placeholder="Alert Header..." />
                     </div>
                     <div className="grid grid-cols-1 gap-6">
                          <div className="form-group">
                              <label className="form-label text-[10px] font-black uppercase tracking-[0.2em] mb-3 block text-slate-500">Target Cohort</label>
                              <select className="form-input bg-slate-950 !py-4 border-slate-800" value={targetRole} onChange={e => { setTargetRole(e.target.value); setTargetEmail(''); }}>
                                  <option value="All">Global (All Users)</option>
                                  <option value="Student">All Students</option>
                                  <option value="Teacher">All Teachers</option>
                                  <option value="HOD">Heads of Department</option>
                                  <option value="Specific">Specific User (Email)</option>
                              </select>
                          </div>
                         {targetRole === 'Specific' && (
                             <div className="form-group animate-in slide-in-from-top-4 duration-300">
                                 <label className="form-label text-[10px] font-black uppercase tracking-[0.2em] mb-3 block text-slate-500">Target Email Match</label>
                                 <input required type="email" className="form-input bg-slate-950 border-secondary/30 focus:border-secondary shadow-lg shadow-secondary/5" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="user@skn.ac" />
                             </div>
                         )}
                     </div>
                     <div className="form-group">
                         <label className="form-label text-[10px] font-black uppercase tracking-[0.2em] mb-3 block text-slate-500">Signal Payload (Message)</label>
                         <textarea required rows="6" className="form-input bg-slate-950 resize-none border-slate-800" value={message} onChange={e => setMessage(e.target.value)} placeholder="Transmit message..."></textarea>
                     </div>
                      <button type="submit" className="w-full bg-secondary hover:bg-white text-slate-900 font-black tracking-widest text-[12px] uppercase py-5 rounded-2xl transition-all shadow-xl hover:shadow-secondary/30 flex items-center justify-center gap-3 active:scale-[0.98]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                          Transmit Signal
                      </button>
                 </form>
             </div>
         )}
      </div>
    </div>
  );
};

export default Announcements;
