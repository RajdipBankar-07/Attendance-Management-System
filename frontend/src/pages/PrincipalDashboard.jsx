import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPARTMENTS = ['CSE', 'E&TC', 'CIVIL', 'MACH', 'ELECT'];
const YEARS = ['F.Y', 'S.Y', 'T.Y', 'Final Year'];
const REFRESH_MS = 60_000; // 60 s live refresh

// ─── Mini icon paths ──────────────────────────────────────────────────────────
const ICONS = {
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  present: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  absent: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  percent: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  theory: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  lab: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  arrow: 'M17 8l4 4m0 0l-4 4m4-4H3',
};

// ─── Reusable Components ──────────────────────────────────────────────────────

const Icon = ({ path, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={path} />
  </svg>
);

const StatCard = ({ title, value, label, color, icon, sub }) => (
  <div className="glass-card !p-7 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
    <div className={`absolute -right-8 -top-8 w-36 h-36 ${color} opacity-[0.06] rounded-full group-hover:scale-125 transition-transform duration-700`} />
    <div className="flex justify-between items-start relative z-10">
      <div className="space-y-3">
        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">{title}</p>
        <div className="flex items-end gap-2">
          <h3 className="text-5xl font-black text-white tracking-tighter leading-none">{value}</h3>
          {sub && <span className="text-sm font-bold text-slate-500 mb-1">{sub}</span>}
        </div>
        {label && <p className="text-[10px] font-semibold text-slate-500 leading-relaxed max-w-[160px]">{label}</p>}
      </div>
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shrink-0 shadow-2xl`}>
        <Icon path={icon} className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const ProgressBar = ({ label, present, total, color = 'bg-emerald-500', onClick, active, studentCount }) => {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const isLow = pct < 75;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left space-y-2 p-3 rounded-2xl transition-all duration-200 ${active ? 'bg-slate-800/60 ring-1 ring-slate-600' : 'hover:bg-slate-800/30'}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
          {studentCount != null && (
            <span className="ml-2 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
              {studentCount} enrolled
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-[10px] text-slate-500">{present}/{total}</span>
          <span className={`text-[12px] font-black ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isLow ? 'bg-red-500 shadow-red-500/30' : `${color} shadow-emerald-500/30`} shadow-lg`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
};

const SectionHeader = ({ accentColor = 'bg-secondary', children }) => (
  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.25em] flex items-center gap-3 mb-8">
    <div className={`w-1.5 h-5 ${accentColor} rounded-full`} />
    {children}
  </h3>
);

const SessionTypeCard = ({ label, icon, present, absent, color }) => {
  const total = present + absent;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  return (
    <div className={`glass-card !p-6 border-slate-800/40 relative overflow-hidden`}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${color} opacity-[0.06] rounded-full`} />
      <div className="flex items-start gap-4 relative z-10">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon path={icon} className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">{label}</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-black text-white">{present}</span>
            <span className="text-xs text-slate-500">/ {total} students</span>
          </div>
          <div className="flex gap-4 text-[10px] font-bold mb-3">
            <span className="text-emerald-400">✓ {present} present</span>
            <span className="text-red-400">✗ {absent} absent</span>
          </div>
          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct < 75 ? 'bg-red-500' : color} transition-all duration-700`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-[10px] font-black mt-1 block ${pct < 75 ? 'text-red-400' : 'text-emerald-400'}`}>{pct}%</span>
        </div>
      </div>
    </div>
  );
};

// ─── Dropdown ────────────────────────────────────────────────────────────────
const FilterSelect = ({ label, value, onChange, options, placeholder }) => (
  <div className="form-group">
    <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 block">{label}</label>
    <select
      className="form-input !py-3 !text-xs"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  </div>
);

// ─── Active Filter Badge ──────────────────────────────────────────────────────
const Badge = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[9px] font-black text-indigo-300 uppercase tracking-wider">
    {label}
    <button onClick={onRemove} className="hover:text-red-400 transition-colors leading-none">
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </span>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const PrincipalDashboard = () => {
  const { user } = useContext(AuthContext);

  // Helper for date restrictions (today and past only)
  const todayStr = new Date().toLocaleDateString('en-CA');

  // Filter state (cascading: Dept → Year → Teacher → Subject + Session type + Date/Time)
  const [selDept, setSelDept] = useState('');
  const [selYear, setSelYear] = useState('');
  const [selTeacher, setSelTeacher] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selSessionType, setSelSessionType] = useState(''); // 'Lecture' | 'Practical' | ''
  const [selStartDate, setSelStartDate] = useState('');
  const [selEndDate, setSelEndDate] = useState('');
  const [selTime, setSelTime] = useState('');
  const [chartView, setChartView] = useState('category'); // 'category' | 'trend'

  const isHOD = user?.role === 'HOD';

  // Initialize HOD department
  useEffect(() => {
    if (isHOD && user?.department?.[0]) {
      setSelDept(user.department[0]);
    }
  }, [user, isHOD]);

  // Data
  const [stats, setStats] = useState(null);
  const [metadata, setMetadata] = useState({ subjects: [], departments: DEPARTMENTS });
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Active drill-down selection on progress bars
  const [activeDept, setActiveDept] = useState(null);
  const [activeYear, setActiveYear] = useState(null);

  const timerRef = useRef(null);

  // ── Fetch subjects dynamically when dept+year change ─────────────────────
  const fetchMetadata = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selDept) params.append('department', selDept);
      if (selYear) params.append('year', selYear);
      const { data } = await axios.get(`/api/reports/filters-metadata?${params}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMetadata(data);
    } catch (e) {
      console.error('Meta fetch:', e);
    }
  }, [selDept, selYear, user.token]);

  // ── Fetch attendance stats ───────────────────────────────────────────────
  const fetchStats = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setSyncing(true);
    try {
      const params = new URLSearchParams();
      if (selDept) params.append('department', selDept);
      if (selYear) params.append('year', selYear);
      if (selTeacher) params.append('teacher', selTeacher);
      if (selSubject) params.append('subject', selSubject);
      if (selSessionType) params.append('sessionType', selSessionType);
      if (selStartDate) params.append('startDate', selStartDate);
      if (selEndDate) params.append('endDate', selEndDate);
      if (selTime) params.append('time', selTime);

      const { data } = await axios.get(`/api/reports/stats?${params}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setStats(data);
      setLastSync(new Date());
    } catch (e) {
      console.error('Stats fetch:', e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [selDept, selYear, selTeacher, selSubject, selSessionType, selStartDate, selEndDate, selTime, user.token]);

  // ── Cascading resets ────────────────────────────────────────────────
  useEffect(() => { setSelYear(''); setSelTeacher(''); setSelSubject(''); setActiveDept(null); setActiveYear(null); }, [selDept]);
  useEffect(() => { setSelTeacher(''); setSelSubject(''); setActiveYear(null); }, [selYear]);
  useEffect(() => { setSelSubject(''); }, [selTeacher]);

  // ── Main data refresh ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchMetadata();
    fetchStats(true);

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchStats(false), REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchStats, fetchMetadata, user]);

  // ── Derived values ────────────────────────────────────────────────────────
  const totalPresent = stats?.overall?.present ?? 0;
  const totalAbsent = stats?.overall?.absent ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;
  const notSubmitted = stats?.notSubmitted ?? 0;
  const attendTotal = totalPresent + totalAbsent;
  const overallPct = attendTotal > 0 ? Math.round((totalPresent / attendTotal) * 100) : 0;

  const theoryPresent = stats?.sessionBreakdown?.Lecture?.present ?? 0;
  const theoryAbsent = stats?.sessionBreakdown?.Lecture?.absent ?? 0;
  const practPresent = stats?.sessionBreakdown?.Practical?.present ?? 0;
  const practAbsent = stats?.sessionBreakdown?.Practical?.absent ?? 0;

  const deptList = stats?.departments ?? [];
  const yearList = stats?.years ?? [];
  const subjectList = stats?.subjects ?? [];

  // Lookup helpers for enrolled student counts per dept/year
  const deptStudentMap = Object.fromEntries(
    (stats?.deptStudentCounts ?? []).map(d => [d.department, d.studentCount])
  );
  const yearStudentMap = Object.fromEntries(
    (stats?.yearStudentCounts ?? []).map(y => [y.year, y.studentCount])
  );

  // ── Chart Data Calculation ────────────────────────────────────────────────
  const getChartData = () => {
    if (!stats) return [];

    // 1. If subject selected -> show Session Type (Theory/Practical)
    if (selSubject) {
      const subj = stats.subjects.find(s => s.subject === selSubject);
      if (!subj) return [];
      const data = [];
      if (subj.lecturePresent !== null || subj.lectureAbsent !== null) {
        data.push({ name: 'Theory', Present: subj.lecturePresent ?? 0, Absent: subj.lectureAbsent ?? 0 });
      }
      if (subj.practicalPresent !== null || subj.practicalAbsent !== null) {
        data.push({ name: 'Practical', Present: subj.practicalPresent ?? 0, Absent: subj.practicalAbsent ?? 0 });
      }
      return data;
    }

    // 2. If Year selected -> show all Subjects
    if (selYear) {
      return stats.subjects.map(s => ({
        name: s.subject.length > 10 ? s.subject.substring(0, 8) + '..' : s.subject,
        fullName: s.subject,
        Present: s.present,
        Absent: s.absent
      }));
    }

    // 3. If Dept selected -> show all Years
    if (selDept) {
      return stats.years.map(y => ({
        name: y.year,
        Present: y.present,
        Absent: Math.max(0, y.total - y.present)
      }));
    }

    // 4. Global view -> show all Departments
    return stats.departments.map(d => ({
      name: d.department,
      Present: d.present,
      Absent: Math.max(0, d.total - d.present)
    }));
  };

  const chartData = getChartData();

  // ── Trend Data Calculation (Time-series) ──────────────────────────────────
  const trendData = (stats?.dailyTrends ?? []).map(t => ({
    name: new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    Present: t.present,
    Absent: t.absent,
    Rate: t.present + t.absent > 0 ? Math.round((t.present / (t.present + t.absent)) * 100) : 0
  }));

  // ── Cascading dropdown options (client-side derived from metadata) ─────────
  const allTeachers = metadata.teachers ?? [];

  // Years: Only show normalized YEARS if a Department is selected.
  // We check case-insensitive presence in metadata.years to keep it "related" to the dept.
  const availableYears = selDept && metadata.years
    ? YEARS.filter(y =>
      metadata.years.some(dbY => dbY.trim().toLowerCase() === y.trim().toLowerCase())
    )
    : [];

  // Teachers: filter by selected year (strict hierarchy: must have year selected)
  const availableTeachers = selYear
    ? allTeachers.filter(t =>
      Array.isArray(t.year) &&
      t.year.some(y => y.trim().toLowerCase() === selYear.trim().toLowerCase())
    )
    : [];

  // Subjects: ONLY show if teacher is selected (strict hierarchy)
  const selectedTeacherObj = selTeacher
    ? allTeachers.find(t => t._id === selTeacher)
    : null;
  const availableSubjects = selectedTeacherObj
    ? (selectedTeacherObj.subject ?? [])
    : [];

  // ── Breadcrumb label ──────────────────────────────────────────────────────
  const scopeParts = [selDept, selYear, selSubject].filter(Boolean);
  const dateParts = [selStartDate && `From ${selStartDate}`, selEndDate && `To ${selEndDate}`, selTime && `@ ${selTime}`].filter(Boolean);
  const scopeLabel = [...scopeParts, ...dateParts].join(' · ') || 'All College';

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading && !stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
        <p className="text-xs text-slate-500 font-black uppercase tracking-[0.3em]">Syncing Live Data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in-up pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-5 bg-slate-900/50 px-8 py-7 rounded-[2rem] border border-slate-800">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 mb-1">
            {user.role} · Attendance Intelligence
          </p>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            Institutional Dashboard
          </h1>
          {scopeLabel !== 'All College' && (
            <p className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Viewing: {scopeLabel}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${syncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {syncing ? 'Syncing…' : 'Live'}
            </span>
          </div>
          {lastSync && (
            <p className="text-[9px] text-slate-600 font-bold">
              Last sync: {lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
          <button
            onClick={() => fetchStats(false)}
            disabled={syncing}
            className="btn bg-slate-800 hover:bg-slate-700 text-slate-300 !px-5 !py-3 disabled:opacity-40"
          >
            <Icon path={ICONS.refresh} className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:block">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      <div className="glass-card !p-7 border-slate-800/40">
        <SectionHeader accentColor="bg-indigo-500">Drill-Down Filters</SectionHeader>

        {/* Row 1: Dept / Year / Teacher / Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">

          {/* 1. Department */}
          <div className="form-group">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 flex items-center gap-2">
              Department
              {isHOD && <span className="text-indigo-400 text-[8px] normal-case font-bold">(Locked to your Dept)</span>}
            </label>
            <select
              className={`form-input !py-3 !text-xs ${isHOD ? 'opacity-60 select-none pointer-events-none' : ''}`}
              value={selDept}
              onChange={e => setSelDept(e.target.value)}
              disabled={isHOD}
            >
              <option value="">{isHOD ? selDept : 'All Departments'}</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 2. Year — Only enabled if Dept is selected */}
          <div className="form-group">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 flex items-center gap-2">
              Academic Year
              {!selDept && <span className="text-slate-700 text-[8px] normal-case font-bold">(select dept first)</span>}
            </label>
            <select
              className={`form-input !py-3 !text-xs ${!selDept ? 'opacity-40 select-none pointer-events-none' : ''}`}
              value={selYear}
              onChange={e => setSelYear(e.target.value)}
              disabled={!selDept}
            >
              <option value="">{selDept ? (availableYears.length ? 'Select Year' : 'No years found') : '—'}</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* 3. Teacher — Only enabled if Year is selected */}
          <div className="form-group">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 flex items-center gap-2">
              Teacher
              {!selYear && <span className="text-slate-700 text-[8px] normal-case font-bold">(select year first)</span>}
            </label>
            <select
              className={`form-input !py-3 !text-xs ${!selYear ? 'opacity-40 select-none pointer-events-none' : ''}`}
              value={selTeacher}
              onChange={e => setSelTeacher(e.target.value)}
              disabled={!selYear}
            >
              <option value="">{selYear ? (availableTeachers.length ? 'Select Teacher' : 'No teachers found') : '—'}</option>
              {availableTeachers.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Subject — Only enabled if Teacher is selected */}
          <div className="form-group">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 flex items-center gap-2">
              Subject
              {!selTeacher && <span className="text-slate-700 text-[8px] normal-case font-bold">(select teacher first)</span>}
              {selTeacher && selectedTeacherObj && (
                <span className="text-emerald-400 text-[8px] normal-case font-bold">{selectedTeacherObj.name}'s subjects</span>
              )}
            </label>
            <select
              className={`form-input !py-3 !text-xs ${!selTeacher ? 'opacity-40 select-none pointer-events-none' : ''}`}
              value={selSubject}
              onChange={e => setSelSubject(e.target.value)}
              disabled={!selTeacher}
            >
              <option value="">{selTeacher ? (availableSubjects.length ? 'Select Subject' : 'No subjects found') : '—'}</option>
              {availableSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Date &amp; Time Range</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Row 2: Session Type / From Date / To Date / Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Session Type */}
          <div className="form-group">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 block">Session Type</label>
            <select
              className="form-input !py-3 !text-xs"
              value={selSessionType}
              onChange={e => setSelSessionType(e.target.value)}
            >
              <option value="">All Sessions</option>
              <option value="Lecture">📖 Theory / Lecture</option>
              <option value="Practical">🔬 Practical / Lab</option>
            </select>
          </div>
          {/* Start Date */}
          <div className="form-group">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 block">From Date</label>
            <input
              type="date"
              className="form-input !py-3 !text-xs"
              value={selStartDate}
              max={selEndDate || todayStr}
              onChange={e => setSelStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="form-group">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 block">To Date</label>
            <input
              type="date"
              className="form-input !py-3 !text-xs"
              value={selEndDate}
              min={selStartDate || undefined}
              max={todayStr}
              onChange={e => setSelEndDate(e.target.value)}
            />
          </div>

          {/* Time (optional) */}
          <div className="form-group">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2 flex items-center gap-2">
              Specific Time
              <span className="text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 rounded-full px-2 py-0.5 text-[8px]">Optional</span>
            </label>
            <input
              type="time"
              className="form-input !py-3 !text-xs"
              value={selTime}
              onChange={e => setSelTime(e.target.value)}
            />
          </div>
        </div>

        {/* Active filter badges */}
        {(selDept || selYear || selTeacher || selSubject || selSessionType || selStartDate || selEndDate || selTime) && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Active:</span>
            {selDept && <Badge label={selDept} onRemove={isHOD ? null : () => setSelDept('')} />}
            {selYear && <Badge label={selYear} onRemove={() => setSelYear('')} />}
            {selTeacher && <Badge label={selectedTeacherObj?.name ?? 'Teacher'} onRemove={() => setSelTeacher('')} />}
            {selSubject && <Badge label={selSubject} onRemove={() => setSelSubject('')} />}
            {selSessionType && <Badge label={selSessionType === 'Lecture' ? '📖 Theory' : '🔬 Practical'} onRemove={() => setSelSessionType('')} />}
            {selStartDate && <Badge label={`From ${selStartDate}`} onRemove={() => setSelStartDate('')} />}
            {selEndDate && <Badge label={`To ${selEndDate}`} onRemove={() => setSelEndDate('')} />}
            {selTime && <Badge label={`Time: ${selTime}`} onRemove={() => setSelTime('')} />}
            <button
              onClick={() => {
                if (!isHOD) setSelDept('');
                setSelYear(''); setSelTeacher(''); setSelSubject(''); setSelSessionType(''); setSelStartDate(''); setSelEndDate(''); setSelTime('');
              }}
              className="text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1.5 ml-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ── Global Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">

        {/* Card 1 — Context-aware: enrolled (no year) or present (year selected) */}
        <div className="glass-card !p-6 flex flex-col gap-3 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className={`absolute inset-0 bg-gradient-to-br ${selYear ? 'from-amber-500/5' : 'from-indigo-500/5'} to-transparent pointer-events-none`} />
          <div className="flex justify-between items-start">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 leading-tight">
              {selYear
                ? <>{selDept ? `${selDept} · ` : ''}{selYear}<br />Present Students</>
                : <>{selDept ? `${selDept} · ` : ''}Total Enrolled</>
              }
            </p>
            <div className={`w-10 h-10 ${selYear ? 'bg-amber-500 shadow-amber-500/20' : 'bg-indigo-500 shadow-indigo-500/20'} rounded-xl flex items-center justify-center shadow-lg shrink-0`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {selYear
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                }
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black text-white tracking-tighter">
            {(selYear ? totalPresent : totalStudents).toLocaleString('en-IN')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selYear ? (
              <>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">Present · {selYear}</span>
                {totalStudents > 0 && <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">{totalStudents.toLocaleString('en-IN')} enrolled</span>}
              </>
            ) : (
              <span className="text-[9px] font-bold text-slate-500">
                {selDept ? `Approved · ${selDept}` : 'All approved students'}
              </span>
            )}
          </div>
        </div>

        {/* Card 2 — Present */}
        <StatCard
          title="Present Today"
          value={totalPresent}
          label={selYear ? `${selYear} attendance marked present` : selDept ? `${selDept} present students` : 'All students marked present'}
          color="bg-emerald-600"
          icon={ICONS.present}
        />

        {/* Card 3 — Absent */}
        <StatCard
          title="Absent Today"
          value={totalAbsent}
          label={selYear ? `${selYear} attendance marked absent` : selDept ? `${selDept} absent students` : 'All students marked absent'}
          color="bg-red-600"
          icon={ICONS.absent}
        />

        {/* Card 4 — Not Submitted (orange) */}
        <div className="glass-card !p-6 flex flex-col gap-3 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          <div className="flex justify-between items-start">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Not Submitted</p>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black text-white tracking-tighter">{notSubmitted.toLocaleString('en-IN')}</p>
          <p className="text-[9px] font-bold text-orange-400/80">
            {notSubmitted === 0
              ? 'All students accounted for ✓'
              : `${notSubmitted} student${notSubmitted > 1 ? 's' : ''} with no record today`
            }
          </p>
        </div>

        {/* Card 5 — Overall % ring */}
        <div className="glass-card !p-6 flex flex-col justify-center items-center text-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent pointer-events-none" />
          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 mb-3">Attendance Rate</p>
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={overallPct < 75 ? '#ef4444' : '#10b981'}
                strokeWidth="3"
                strokeDasharray={`${overallPct} ${100 - overallPct}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-black ${overallPct < 75 ? 'text-red-400' : 'text-emerald-400'}`}>
                {overallPct}%
              </span>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 font-bold mt-2">
            {attendTotal === 0 ? 'No data today' : overallPct >= 75 ? 'Within Target' : 'Below 75%'}
          </p>
        </div>
      </div>

      {/* ── Dynamic Analytics Chart ── */}
      {!loading && chartData.length > 0 && (
        <div className="glass-card !p-8 border-slate-800/30 overflow-hidden group">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                {chartView === 'category' ? 'Attendance Composition' : 'Attendance Velocity'}
              </h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                {chartView === 'category'
                  ? (selSubject ? `Comparison for ${selSubject}` : selYear ? `Subject performance for ${selYear}` : selDept ? `Annual performance in ${selDept}` : 'College Departmental Benchmarks')
                  : `Timeline performance from ${selStartDate || 'Start'} to ${selEndDate || 'Today'}`
                }
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* View Selector */}
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setChartView('category')}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${chartView === 'category' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Categories
                </button>
                <button
                  onClick={() => setChartView('trend')}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${chartView === 'trend' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Trends
                </button>
              </div>

              {/* Legend */}
              <div className="hidden sm:flex gap-4 p-2 px-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">Absent</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'category' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">
                              {payload[0].payload.fullName || label}
                            </p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between gap-6">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Present</span>
                                <span className="text-[10px] font-black text-white">{payload[0].value}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-[9px] font-bold text-red-400 uppercase">Absent</span>
                                <span className="text-[10px] font-black text-white">{payload[1].value}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} animationDuration={1500} />
                  <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} animationDuration={1500} />
                </BarChart>
              ) : (
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">
                              {label}
                            </p>
                            <div className="space-y-1.5 px-1">
                              <div className="flex justify-between gap-6">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Present</span>
                                <span className="text-[10px] font-black text-white">{payload[0].value}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-[9px] font-bold text-red-400 uppercase">Absent</span>
                                <span className="text-[10px] font-black text-white">{payload[1].value}</span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between gap-6">
                                <span className="text-[9px] font-black text-indigo-400 uppercase">Attendance Rate</span>
                                <span className="text-[10px] font-black text-white">{payload[0].payload.Rate}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Present"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                  <Line
                    type="monotone"
                    dataKey="Absent"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Theory vs Practical ── */}
      {(theoryPresent + theoryAbsent + practPresent + practAbsent) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SessionTypeCard label="Theory / Lecture Sessions" icon={ICONS.theory} present={theoryPresent} absent={theoryAbsent} color="bg-indigo-500" />
          <SessionTypeCard label="Laboratory / Practical Sessions" icon={ICONS.lab} present={practPresent} absent={practAbsent} color="bg-violet-500" />
        </div>
      )}

      {/* ── Dept + Year Performance (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Dept breakdown */}
        <div className="glass-card !p-8 border-slate-800/40">
          <SectionHeader accentColor="bg-emerald-500">
            Department-wise Attendance
          </SectionHeader>
          {deptList.length > 0 ? (
            <div className="space-y-2">
              {deptList.map(d => (
                <ProgressBar
                  key={d.department}
                  label={d.department || 'Uncategorized'}
                  present={d.present ?? 0}
                  total={d.total ?? 0}
                  studentCount={deptStudentMap[d.department]}
                  color="bg-emerald-500"
                  active={activeDept === d.department}
                  onClick={() => {
                    const next = activeDept === d.department ? '' : d.department;
                    setActiveDept(next || null);
                    setSelDept(next);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState msg="No department data for current filters" />
          )}
        </div>

        {/* Year breakdown */}
        <div className="glass-card !p-8 border-slate-800/40">
          <SectionHeader accentColor="bg-amber-500">
            Year-wise Attendance
          </SectionHeader>
          {yearList.length > 0 ? (
            <div className="space-y-2">
              {yearList.map(y => (
                <ProgressBar
                  key={y.year}
                  label={y.year || 'N/A'}
                  present={y.present ?? 0}
                  total={y.total ?? 0}
                  studentCount={yearStudentMap[y.year]}
                  color="bg-amber-500"
                  active={activeYear === y.year}
                  onClick={() => {
                    const next = activeYear === y.year ? '' : y.year;
                    setActiveYear(next || null);
                    setSelYear(next);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState msg="No year-wise data for current filters" />
          )}
        </div>
      </div>

      {/* ── Subject-level (shown when dept+year selected or data available) ── */}
      {subjectList.length > 0 && (
        <div className="glass-card !p-8 border-slate-800/40">
          <SectionHeader accentColor="bg-sky-500">Subject-wise Attendance Breakdown</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subjectList.map(s => {
              const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
              const isLow = pct < 75;
              return (
                <button
                  key={s.subject}
                  onClick={() => setSelSubject(prev => prev === s.subject ? '' : s.subject)}
                  className={`text-left p-5 rounded-2xl border transition-all duration-200 group
                    ${selSubject === s.subject
                      ? 'border-sky-500/50 bg-sky-500/5'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[11px] font-black text-slate-200 uppercase tracking-wider leading-tight flex-1 pr-2">
                      {s.subject}
                    </p>
                    <span className={`text-sm font-black ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                      {pct}%
                    </span>
                  </div>
                  {/* Theory vs Practical mini breakdown */}
                  <div className="space-y-1.5 mb-3">
                    {s.lecturePresent != null && (
                      <div className="flex items-center gap-2 text-[9px] text-slate-500">
                        <span className="w-1 h-1 rounded-full bg-indigo-400 inline-block" />
                        Theory: <span className="text-white font-bold">{s.lecturePresent}</span>/{(s.lecturePresent ?? 0) + (s.lectureAbsent ?? 0)}
                      </div>
                    )}
                    {s.practicalPresent != null && (
                      <div className="flex items-center gap-2 text-[9px] text-slate-500">
                        <span className="w-1 h-1 rounded-full bg-violet-400 inline-block" />
                        Practical: <span className="text-white font-bold">{s.practicalPresent}</span>/{(s.practicalPresent ?? 0) + (s.practicalAbsent ?? 0)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 text-[9px] font-bold mb-2">
                    <span className="text-emerald-400">✓ {s.present} present</span>
                    <span className="text-red-400">✗ {s.absent} absent</span>
                  </div>
                  <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isLow ? 'bg-red-500' : 'bg-sky-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No data placeholder ── */}
      {!loading && totalStudents === 0 && (
        <div className="glass-card !p-16 text-center border-slate-800/30">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <Icon path={ICONS.percent} className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">
            No Attendance Submitted Yet
          </h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Attendance data will appear here as teachers submit sessions.
            {(selDept || selYear || selSubject) && ' Try clearing filters to see broader data.'}
          </p>
        </div>
      )}

      {/* ── Quick Reports Link ── */}
      <div className="flex justify-center pt-4">
        <NavLink
          to="/principal/reports"
          className="btn bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-4 px-10 py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/20 transition-all hover:scale-[1.02]"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">Open Full Reports Engine</span>
          <Icon path={ICONS.arrow} className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </NavLink>
      </div>
    </div>
  );
};

const EmptyState = ({ msg }) => (
  <p className="text-center text-[10px] font-black text-slate-700 uppercase tracking-widest py-10">{msg}</p>
);

export default PrincipalDashboard;
