import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

const TeacherAnalytics = () => {
  const { user } = useContext(AuthContext);
  const { showNotification } = useNotification();

  const [filters, setFilters] = useState({
    department: user?.department?.[0] || '',
    year: user?.year?.[0] || '',
    batch: '',
    sessionType: 'Lecture',
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalPresent: 0, totalAbsent: 0, avgAttendance: 0 });
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const { data } = await axios.get('/api/batches/teacher', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setBatches(data);
      } catch (e) {
        console.error("No batches found");
      }
    };
    if (user && user.token) {
        fetchBatches();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user || !user.token) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val) queryParams.append(key, val);
      });

      const response = await axios.get(`/api/reports/teacher-analytics?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      setChartData(response.data);

      // Calculate summaries
      let tp = 0, ta = 0;
      response.data.forEach(d => {
        tp += d.Present;
        ta += d.Absent;
      });
      const total = tp + ta;
      setStats({
        totalPresent: tp,
        totalAbsent: ta,
        avgAttendance: total > 0 ? Math.round((tp / total) * 100) : 0
      });

    } catch (error) {
      showNotification('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-emerald-400 font-bold flex justify-between gap-4">
              <span>Present:</span> <span>{payload[0].value}</span>
            </p>
            <p className="text-rose-400 font-bold flex justify-between gap-4">
              <span>Absent:</span> <span>{payload[1].value}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            Attendance <span className="text-primary italic">Analytics</span>
          </h1>
          <p className="text-slate-400 font-medium">Real-time attendance trends and student engagement flow.</p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          <select 
            value={filters.sessionType} 
            onChange={(e) => setFilters({...filters, sessionType: e.target.value, batch: ''})}
            className="bg-slate-800 text-white text-xs font-bold rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="Lecture">Theory Lecture</option>
            <option value="Practical">Practical Lab</option>
          </select>
          
          <select 
            value={filters.department} 
            onChange={(e) => setFilters({...filters, department: e.target.value})}
            className="bg-slate-800 text-white text-xs font-bold rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-primary outline-none"
          >
            {user.role === 'Teacher' && Array.isArray(user.department) ? (
              user.department.map(d => <option key={d} value={d}>{d}</option>)
            ) : (
              <option value="">All Departments</option>
            )}
          </select>

          <select 
            value={filters.year} 
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="bg-slate-800 text-white text-xs font-bold rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">All Years</option>
            {user.role === 'Teacher' && Array.isArray(user.year) ? (
              user.year.map(y => <option key={y} value={y}>{y}</option>)
            ) : (
              ['F.Y', 'S.Y', 'T.Y', 'Final Year'].map(y => <option key={y} value={y}>{y}</option>)
            )}
          </select>

          {filters.sessionType === 'Practical' && (
             <select 
               value={filters.batch} 
               onChange={(e) => setFilters({...filters, batch: e.target.value})}
               className="bg-slate-800 text-indigo-400 text-xs font-black rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
             >
               <option value="">All Batches</option>
               {batches
                 .filter(b => !filters.year || b.year === filters.year)
                 .map(b => (
                 <option key={b._id} value={b._id}>{b.batchName} ({b.year})</option>
               ))}
             </select>
          )}

          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            className="bg-slate-800 text-white text-xs font-bold rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-primary outline-none"
          />
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            className="bg-slate-800 text-white text-xs font-bold rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card !bg-emerald-500/5 border-emerald-500/20 group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-emerald-400 text-xs font-black tracking-widest uppercase bg-emerald-400/10 px-3 py-1 rounded-full">Present</span>
          </div>
          <div className="text-4xl font-black text-white mb-1">{stats.totalPresent}</div>
          <div className="text-slate-500 text-sm font-medium uppercase tracking-widest">Students Marked Present</div>
        </div>

        <div className="glass-card !bg-rose-500/5 border-rose-500/20 group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-rose-400 text-xs font-black tracking-widest uppercase bg-rose-400/10 px-3 py-1 rounded-full">Absent</span>
          </div>
          <div className="text-4xl font-black text-white mb-1">{stats.totalAbsent}</div>
          <div className="text-slate-500 text-sm font-medium uppercase tracking-widest">Students Marked Absent</div>
        </div>

        <div className="glass-card !bg-indigo-500/5 border-indigo-500/20 group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-indigo-400 text-xs font-black tracking-widest uppercase bg-indigo-400/10 px-3 py-1 rounded-full">Efficiency</span>
          </div>
          <div className="text-4xl font-black text-white mb-1">{stats.avgAttendance}%</div>
          <div className="text-slate-500 text-sm font-medium uppercase tracking-widest">Average Daily Attendance</div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="glass-card !p-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-primary to-rose-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Attendance Volume</h3>
            <p className="text-slate-500 text-sm font-medium">Daily student presence vs. absence flow</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Absent</span>
            </div>
            <div className="flex items-center gap-2 ml-4 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Data</span>
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10} 
                fontWeight="bold" 
                tickMargin={15}
                axisLine={false}
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                fontWeight="bold" 
                axisLine={false}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4f46e5', strokeWidth: 2 }} />
              <Area 
                type="monotone" 
                dataKey="Present" 
                stroke="#10b981" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorPresent)" 
                animationDuration={2000}
              />
              <Area 
                type="monotone" 
                dataKey="Absent" 
                stroke="#f43f5e" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorAbsent)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalytics;
