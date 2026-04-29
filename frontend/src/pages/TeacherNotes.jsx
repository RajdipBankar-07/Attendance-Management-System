import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const TeacherNotes = () => {
  const { user } = useContext(AuthContext);
  const { showNotification, confirmAction } = useNotification();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'General',
    importance: 'Medium'
  });

  const fetchNotes = async () => {
    if (!user || !user.token) return;
    try {
      const { data } = await axios.get('/api/notes', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNotes(data);
    } catch (error) {
      showNotification('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/notes', newNote, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showNotification('Note saved successfully', 'success');
      setIsModalOpen(false);
      setNewNote({ title: '', content: '', category: 'General', importance: 'Medium' });
      fetchNotes();
    } catch (error) {
      showNotification('Failed to save note', 'error');
    }
  };

  const handleDeleteNote = (id) => {
    confirmAction({
      title: 'Delete Note',
      message: 'Are you sure you want to permanently delete this note? This cannot be undone.',
      type: 'error',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/notes/${id}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          showNotification('Note deleted successfully', 'success');
          fetchNotes();
        } catch (error) {
          showNotification('Delete failed', 'error');
        }
      }
    });
  };

  const getImportanceColor = (imp) => {
    switch (imp) {
      case 'High': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'Medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            My <span className="text-primary italic">Notes</span>
          </h1>
          <p className="text-slate-400 font-medium">Capture reminders, student tasks, and quick pointers.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary flex items-center gap-2 group shadow-xl shadow-indigo-500/20"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Compose Note
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card h-48 animate-pulse bg-slate-800/20 border-slate-700"></div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="glass-card !bg-transparent border-dashed border-slate-800 h-64 flex flex-col items-center justify-center text-slate-500">
           <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
           </svg>
           <p className="font-bold tracking-widest text-xs uppercase">No notes found. Start by creating one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <div key={note._id} className="glass-card group flex flex-col hover:border-slate-600 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${getImportanceColor(note.importance)}`}>
                  {note.importance}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{note.category}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">{note.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 whitespace-pre-wrap">{note.content}</p>
              
              <div className="mt-auto pt-6 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
                <button 
                  onClick={() => handleDeleteNote(note._id)}
                  className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m5 4h5" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-xl animate-in zoom-in duration-300 shadow-2xl border-primary/20 bg-slate-900">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
              <h2 className="text-2xl font-black uppercase tracking-widest text-white italic">Create <span className="text-primary not-italic">New Note</span></h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddNote} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Title</label>
                <input 
                  type="text" 
                  value={newNote.title}
                  onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-4 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all" 
                  placeholder="Note header..." 
                  required 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Content / Description</label>
                <textarea 
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-4 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-y min-h-[180px]" 
                  placeholder="Describe your note or task in detail..." 
                  required 
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn bg-slate-800 text-slate-300 flex-1 py-4">Discard</button>
                <button type="submit" className="btn btn-primary flex-1 py-4 uppercase tracking-[0.2em] font-black text-xs">Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherNotes;
