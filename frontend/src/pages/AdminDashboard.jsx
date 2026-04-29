import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const { data } = await axios.get('/api/users/stats', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchStats();
    }, [user]);

    if (loading) return (
        <div className="min-h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
        </div>
    );

    const StatCard = ({ title, value, icon, color, trend }) => (
        <div className="glass-card !p-6 border-slate-800/40 hover:border-indigo-500/30 transition-all group overflow-hidden relative">
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${color} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700`}></div>
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{title}</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
                    {trend && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            {trend}
                        </div>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
                    </svg>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Institutional Dashboard</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2 italic shadow-indigo-500/10">Real-time Node Monitoring & Analytics</p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{new Date().toDateString()}</p>
                    <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">System Pulse: Active</p>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Faculty Count" 
                    value={stats?.Teacher || 0} 
                    icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                    color="bg-indigo-600"
                />
                <StatCard 
                    title="Student Roster" 
                    value={stats?.Student || 0} 
                    icon="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" 
                    color="bg-emerald-500"
                />
                <StatCard 
                    title="Course Offerings" 
                    value={stats?.courseOfferings || 0} 
                    icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                    color="bg-blue-600"
                />
                <StatCard 
                    title="Pending Guards" 
                    value={stats?.pending || 0} 
                    icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                    color="bg-amber-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Dept Distribution */}
                <div className="glass-card !p-8 border-slate-800/40">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                        Student Departmental Distribution
                    </h3>
                    <div className="space-y-6">
                        {stats?.departments?.length > 0 ? stats.departments.map(dept => (
                            <div key={dept._id} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">{dept._id}</p>
                                    <p className="text-[10px] font-bold text-emerald-400">{dept.count} Students</p>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-in slide-in-from-left duration-1000"
                                        style={{ width: `${(dept.count / Math.max(1, stats.Student)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-slate-600 italic py-10">No students found categorized by department</p>
                        )}
                    </div>
                </div>

                {/* Year Distribution */}
                <div className="glass-card !p-8 border-slate-800/40">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                        Student Academic Clusters (Years)
                    </h3>
                    <div className="space-y-6">
                        {stats?.years?.length > 0 ? stats.years.map(y => (
                            <div key={y._id} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">{y._id}</p>
                                    <p className="text-[10px] font-bold text-indigo-400">{y.count} Enrollments</p>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.3)] animate-in slide-in-from-left duration-1000"
                                        style={{ width: `${(y.count / Math.max(1, stats.Student)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-slate-600 italic py-10">No academic year distribution data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Role Summary Grid */}
            <div className="glass-card !p-8 border-slate-800/40">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8">Role Hierarchy Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {['Admin', 'Principal', 'Vice-Principal', 'HOD', 'Teacher', 'Student'].map(role => (
                        <div key={role} className="p-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl flex flex-col items-center justify-center group hover:bg-slate-800/50 transition-all">
                            <p className="text-2xl font-black text-white group-hover:scale-110 transition-transform">{stats?.[role] || 0}</p>
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mt-1 text-center truncate w-full">{role}</p>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="flex justify-center pt-8">
                <NavLink to="/admin/users" className="btn btn-primary flex items-center justify-center gap-4 px-12 py-5 group shadow-2xl shadow-indigo-500/10">
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">Launch Global Identity Manager</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </NavLink>
            </div>
        </div>
    );
};

export default AdminDashboard;
