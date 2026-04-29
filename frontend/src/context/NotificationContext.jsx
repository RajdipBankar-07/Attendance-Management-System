import React, { createContext, useState, useContext, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [confirmData, setConfirmData] = useState(null);

    const showNotification = useCallback((message, type = 'success') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    const confirmAction = useCallback(({ title, message, onConfirm, type = 'warning' }) => {
        setConfirmData({ title, message, onConfirm, type });
    }, []);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleConfirm = () => {
        if (confirmData?.onConfirm) confirmData.onConfirm();
        setConfirmData(null);
    };

    return (
        <NotificationContext.Provider value={{ showNotification, confirmAction }}>
            {children}
            
            {/* TOAST CONTAINER */}
            <div className="fixed top-12 right-12 z-[10000] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
                {notifications.map((n) => (
                    <div 
                        key={n.id}
                        className={`pointer-events-auto p-5 rounded-3xl border backdrop-blur-3xl shadow-2xl flex items-center justify-between gap-5 animate-in slide-in-from-right-full duration-700 overflow-hidden relative group
                            ${n.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                              n.type === 'error' ? 'bg-rose-500/20 border-rose-500/20 text-rose-400' : 
                              n.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                              'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}
                        `}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner
                                ${n.type === 'success' ? 'bg-emerald-500/20' : 
                                  n.type === 'error' ? 'bg-rose-500/20' : 
                                  n.type === 'warning' ? 'bg-amber-500/20' :
                                  'bg-indigo-500/20'}
                            `}>
                                {n.type === 'success' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                ) : n.type === 'warning' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">{n.type}</p>
                                <p className="text-sm font-bold leading-tight">{n.message}</p>
                            </div>
                        </div>

                        <button onClick={() => removeNotification(n.id)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        
                        {/* Progress line */}
                        <div className={`absolute bottom-0 left-0 h-1 transition-all duration-[5000ms] ease-linear w-full
                             ${n.type === 'success' ? 'bg-emerald-500/40' : 
                               n.type === 'error' ? 'bg-rose-500/40' : 
                               n.type === 'warning' ? 'bg-amber-500/40' :
                               'bg-indigo-500/40'}
                        `} style={{ animation: 'shrinkWidth 5s linear forwards' }}></div>
                    </div>
                ))}
            </div>

            {/* CUSTOM CONFIRM DIALOG */}
            {confirmData && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 text-center">
                            <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 
                                ${confirmData.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}
                            `}>
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight mb-2 uppercase tracking-widest">{confirmData.title || 'Are you sure?'}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{confirmData.message}</p>
                        </div>
                        <div className="p-8 bg-slate-900/50 border-t border-slate-800 flex gap-4">
                            <button onClick={() => setConfirmData(null)} className="flex-1 px-6 py-4 rounded-2xl border border-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all">Cancel</button>
                            <button 
                                onClick={handleConfirm}
                                className={`flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-xl transition-all
                                    ${confirmData.type === 'warning' ? 'bg-amber-600 shadow-amber-600/20' : 'bg-red-600 shadow-red-600/20'}
                                `}
                            >
                                Confirm Action
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes shrinkWidth {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </NotificationContext.Provider>
    );
};
