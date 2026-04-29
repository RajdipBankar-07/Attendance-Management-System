import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DEPARTMENTS = ['CSE', 'IT', 'E&TC', 'MECH', 'CIVIL', 'ELECT', 'AIDS'];
const YEARS = ['F.Y', 'S.Y', 'T.Y', 'Final Year'];

const PhoneInput = ({ label, value, onChange }) => (
  <div className="space-y-2">
    {label && <label className="form-label">{label}</label>}
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
         <span className="text-slate-600 font-bold border-r border-slate-800 pr-3 text-[10px]">+91</span>
      </div>
      <input 
        type="text" 
        pattern="\d*"
        className="form-input !pl-14 tracking-widest font-mono" 
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
        required 
      />
    </div>
  </div>
);

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'Teacher',
    department: [], year: [], subject: [],
    rollNumber: '', phone: '', studentPhone: '', parentPhone: '', gender: ''
  });
  
  const [manualSubject, setManualSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  
   const { login, register } = useContext(AuthContext);
   const { showNotification } = useNotification();
   const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (formData.role === 'Student' && formData.department.length > 0 && formData.year.length > 0) {
        setIsLoadingSubjects(true);
        try {
          const { data } = await axios.get(`/api/auth/subjects?department=${formData.department[0]}&year=${formData.year[0]}`);
          setAvailableSubjects(data);
        } catch (err) { console.error("Failed to fetch subjects"); }
        finally { setIsLoadingSubjects(false); }
      }
    };
    fetchSubjects();
  }, [formData.role, formData.department, formData.year]);

  const handleToggleValue = (field, value) => {
    setFormData(prev => {
      const current = prev[field];
      const isDeptOrYear = field === 'department' || field === 'year';
      return { 
        ...prev, 
        [field]: current.includes(value) ? current.filter(i => i !== value) : [...current, value],
        // Clear subjects if dept/year changes to prevent stale selections
        ...(isDeptOrYear ? { subject: [] } : {})
      };
    });
  };

  const setSingleValue = (field, value) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: [value],
      // Clear subjects if dept/year changes
      ...(field === 'department' || field === 'year' ? { subject: [] } : {})
    }));
  };

  const handleAddManualSubject = (e) => {
    if (e.key === 'Enter' && manualSubject.trim()) {
      e.preventDefault();
      if (!formData.subject.includes(manualSubject.trim())) {
        setFormData(prev => ({ ...prev, subject: [...prev.subject, manualSubject.trim()] }));
      }
      setManualSubject('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (formData.role === 'Student') {
          if (formData.studentPhone.length !== 13 || formData.parentPhone.length !== 13) {
             setError("Invalid phone number length"); return setIsSubmitting(false);
          }
        }
        const res = await register(formData);
        if (res.success) {
          setSuccess("Registration confirmed. Welcome to the portal.");
          setIsRegister(false);
        } else { setError(res.message); }
      } else {
        const res = await login(formData.email, formData.password);
         if (res.success) {
           const userInfo = JSON.parse(localStorage.getItem('userInfo'));
           showNotification(`Welcome back, ${userInfo.name}!`, 'info');
           const routeMap = { 'Admin': '/admin', 'Teacher': '/teacher', 'HOD': '/hod', 'Student': '/student', 'Principal': '/principal', 'Vice-Principal': '/principal' };
           navigate(routeMap[userInfo?.role] || '/');
         } else { 
           setError(res.message); 
           showNotification(res.message, 'error');
         }
       }
     } catch (err) { 
       setError("An unexpected error occurred"); 
       showNotification("Login failed. Check connection.", 'error');
     }
     finally { setIsSubmitting(false); }
   };


  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 lg:p-8 selection:bg-indigo-500/30">
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 rounded-[32px] overflow-hidden shadow-[0_0_80px_-15px_rgba(0,0,0,0.6)] animate-fade-in-up border border-white/5">
        
        {/* Left Side: Branding & Info (Col 4) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col justify-between p-12 bg-indigo-600 relative overflow-hidden">
           {/* Decorative patterns */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

           <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
                 </svg>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tight leading-[0.9] font-outfit uppercase">EduAttend<br/><span className="text-indigo-900/40">Portal</span></h1>
              <p className="text-indigo-100 text-sm font-medium tracking-wide max-w-[200px] opacity-80 uppercase">The future of academic management.</p>
           </div>
           
           <div className="space-y-8 relative z-10">
              <div className="p-8 bg-black/10 rounded-3xl border border-white/10 backdrop-blur-md">
                 <p className="text-base font-semibold text-white leading-relaxed italic">"Powerful tools for institutional tracking and academic growth."</p>
                 <div className="flex items-center gap-4 mt-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 border border-white/20 flex items-center justify-center text-xs font-black shadow-lg">SKN</div>
                    <div>
                       <p className="text-[11px] font-black uppercase tracking-widest text-white">SKN College</p>
                       <p className="text-[9px] font-bold text-indigo-200/60 uppercase">Management Node</p>
                    </div>
                 </div>
              </div>
              <div className="flex gap-2">
                 {[1,2,3].map(i => <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i===1 ? 'w-12 bg-white' : 'w-3 bg-white/20'}`}></div>)}
              </div>
           </div>
        </div>

        {/* Right Side: Form (Col 8) */}
        <div className="lg:col-span-8 bg-[#0e1117] flex flex-col h-[90vh] lg:h-[800px]">
           <div className="p-8 lg:p-14 overflow-y-auto custom-scrollbar flex-1">
              <div className="mb-10 flex justify-between items-start">
                 <div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase font-outfit">{isRegister ? 'Join Portal' : 'Authentication'}</h2>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mt-2">{isRegister ? 'Create your institutional profile' : 'Secure Academic Gateway'}</p>
                 </div>
                 <div className="lg:hidden w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
                    </svg>
                 </div>
              </div>

              {error && <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8 flex items-center gap-4 animate-in fade-in"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div><p className="text-xs font-bold uppercase tracking-widest text-red-500">{error}</p></div>}
              {success && <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-8 flex items-center gap-4 animate-in fade-in"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">{success}</p></div>}

              <form onSubmit={handleSubmit} className="space-y-8">
                 {isRegister && (
                    <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                       <div className="space-y-2.5">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Full Member Identity</label>
                          <input type="text" className="form-input !text-base !py-4" placeholder="e.g. Rahul S. Patil" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required={isRegister} />
                       </div>

                       <div className="space-y-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Gender Identity</label>
                          <div className="flex gap-4">
                             {['Male', 'Female', 'Other'].map(g => (
                                <button key={g} type="button" onClick={() => setFormData({...formData, gender: g})} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all duration-300 ${formData.gender === g ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-[#161b22] border-white/5 text-slate-500 hover:text-white'}`}>{g}</button>
                             ))}
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2.5">
                             <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Institutional Role</label>
                             <select className="form-input !text-base !py-4 cursor-pointer appearance-none" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value, department: [], year: [], subject: []})}>
                                <option value="Teacher">Teacher Access</option>
                                <option value="Student">Student Access</option>
                             </select>
                          </div>
                          
                          <div className="space-y-2.5">
                             <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">{formData.role === 'Teacher' ? 'Assigned Depts' : 'Primary Dept'}</label>
                             {formData.role === 'Teacher' ? (
                                <div className="flex flex-wrap gap-2 p-4 bg-[#161b22] rounded-2xl border border-white/5">
                                   {DEPARTMENTS.map(d => (
                                      <button key={d} type="button" onClick={() => handleToggleValue('department', d)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border transition-all duration-300 ${formData.department.includes(d) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}>{d}</button>
                                   ))}
                                </div>
                             ) : (
                                <select className="form-input !text-base !py-4 cursor-pointer appearance-none" value={formData.department[0] || ''} onChange={(e) => setSingleValue('department', e.target.value)} required>
                                   <option value="">Select Department</option>
                                   {DEPARTMENTS.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                </select>
                             )}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">{formData.role === 'Teacher' ? 'Academic Tenure (Multiple)' : 'Enrollment Year'}</label>
                          <div className="flex flex-wrap gap-2.5">
                             {YEARS.map(y => (
                                <button key={y} type="button" 
                                  onClick={() => formData.role === 'Teacher' ? handleToggleValue('year', y) : setSingleValue('year', y)} 
                                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all duration-300 ${formData.year.includes(y) ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-[#161b22] border-white/5 text-slate-500 hover:text-white'}`}
                                >
                                  {y}
                                </button>
                             ))}
                          </div>
                       </div>

                       {formData.role === 'Teacher' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-2.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Personal Contact</label>
                                <PhoneInput label="" value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} />
                             </div>
                             <div className="space-y-2.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Specialty</label>
                                <input type="text" className="form-input !text-base !py-4" placeholder="e.g. Theory of Computation" value={formData.subject.join(', ')} onChange={(e) => setFormData({...formData, subject: e.target.value.split(',').map(s => s.trim())})} required />
                             </div>
                          </div>
                       ) : (
                          <div className="space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2.5">
                                   <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Roll ID</label>
                                   <input type="text" className="form-input !text-base !py-4" placeholder="e.g. 101" value={formData.rollNumber} onChange={(e) => setFormData({...formData, rollNumber: e.target.value})} required />
                                </div>
                                <div className="space-y-2.5">
                                   <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Assigned Subjects</label>
                                   <div className="space-y-4">
                                      <div className="flex flex-wrap gap-2 p-3 bg-[#161b22] rounded-2xl border border-white/5 max-h-40 overflow-y-auto">
                                         {availableSubjects.length > 0 ? availableSubjects.map(s => (
                                            <button key={s} type="button" onClick={() => handleToggleValue('subject', s)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all duration-300 ${formData.subject.includes(s) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-500'}`}>{s}</button>
                                         )) : <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest p-2">Select Dept/Year to see subjects</p>}
                                      </div>
                                      <input 
                                         className="form-input !py-3 !text-sm border-dashed" 
                                         placeholder="Type manual subject & press Enter" 
                                         value={manualSubject} 
                                         onChange={e => setManualSubject(e.target.value)} 
                                         onKeyDown={handleAddManualSubject} 
                                      />
                                   </div>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2.5">
                                   <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Student Mobile</label>
                                   <PhoneInput label="" value={formData.studentPhone} onChange={(v) => setFormData({...formData, studentPhone: v})} />
                                </div>
                                <div className="space-y-2.5">
                                   <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Guardian Mobile</label>
                                   <PhoneInput label="" value={formData.parentPhone} onChange={(v) => setFormData({...formData, parentPhone: v})} />
                                </div>
                             </div>
                          </div>
                       )}
                    </div>
                 )}

                 <div className="space-y-8">
                    <div className="space-y-2.5">
                       <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Institutional Email</label>
                       <input type="email" className="form-input !text-base !py-4" placeholder="e.g. koli@skn.ac" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                    </div>

                    <div className="space-y-2.5 relative">
                       <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Secure Passkey</label>
                       <div className="relative group">
                          <input type={showPassword ? "text" : "password"} className="form-input !text-base !py-4 pr-14" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-all">
                             {showPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                          </button>
                       </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full shadow-2xl mt-4 h-[64px] flex items-center justify-center gap-4 group rounded-[20px]">
                       <span className="text-xs font-black uppercase tracking-[0.4em]">{isSubmitting ? 'Architecting...' : isRegister ? 'Commit Profile' : 'Authenticate Identity'}</span>
                       {!isSubmitting && <svg className="w-5 h-5 transform group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>}
                    </button>
                 </div>
              </form>

              <div className="mt-12 py-10 border-t border-white/5 flex flex-col items-center gap-4">
                 <p className="text-[11px] font-black uppercase tracking-[.2em] text-slate-500">
                    {isRegister ? "Already part of the network?" : "New to the institution?"}
                    <button onClick={() => setIsRegister(!isRegister)} className="ml-3 text-white hover:text-indigo-400 transition-all font-black underline decoration-2 underline-offset-8 decoration-indigo-600 font-outfit">
                      {isRegister ? "Sign in Access" : "Provision Profile"}
                    </button>
                 </p>
              </div>
           </div>
        </div>
      </div>
      
      {/* Decorative Blur Blobs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -z-10"></div>
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] -z-10"></div>
    </div>
  );
};

export default Login;
