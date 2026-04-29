import React, { useContext } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrincipalLayout = () => {
  const { user, loading, logout } = useContext(AuthContext);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
    </div>
  );
  
  if (!user || (user.role !== 'Principal' && user.role !== 'Vice-Principal')) {
    return <Navigate to="/login" />;
  }

  const navItems = [
    { name: 'Institutional Pulse', path: '/principal', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { name: 'Analytical Reports', path: '/principal/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Announcements', path: '/principal/announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  ];

  // Vice-Principal gets teal accent, Principal gets emerald
  const isVP = user.role === 'Vice-Principal';
  const accentBg     = isVP ? 'bg-teal-500'             : 'bg-secondary';
  const accentShadow = isVP ? 'shadow-teal-500/20'      : 'shadow-emerald-500/20';
  const accentActive = isVP ? 'bg-teal-500 shadow-teal-500/20' : 'bg-secondary shadow-emerald-500/20';
  const accentBorder = isVP ? 'border-teal-500/20 bg-teal-500/5' : 'border-secondary/20 bg-secondary/5';
  const accentText   = isVP ? 'text-teal-400'           : 'text-emerald-400';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="w-72 border-r border-slate-800 flex flex-col fixed inset-y-0 shadow-2xl bg-slate-900/50 backdrop-blur-xl">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${accentBg} rounded-xl flex items-center justify-center shadow-lg ${accentShadow}`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight leading-none">
                {isVP ? 'VP' : 'Principal'}
                <span className={accentText}> Portal</span>
              </h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-0.5">
                {isVP ? 'Vice-Principal' : 'Principal'} Access
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/principal'}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? `${accentActive} text-white shadow-lg`
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`
              }
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span className="font-medium text-sm">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className={`glass-card !p-4 !rounded-xl ${accentBorder} mb-4`}>
            <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Signed In As</div>
            <div className="text-sm font-semibold truncate text-white">{user.name}</div>
            <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${accentText}`}>
              {user.role}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 border border-slate-700 hover:border-red-500/30 text-slate-400 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-72 p-10 min-h-screen">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PrincipalLayout;
