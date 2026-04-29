import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allDepts, setAllDepts] = useState([]);
  const [allYears, setAllYears] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;
  
  const { user } = useContext(AuthContext);
  const { showNotification, confirmAction } = useNotification();
  
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    subject: '',
    year: '',
    time: '',
    teacher: '',
    startDate: '',
    endDate: '',
    studentSearch: '',
    sessionType: '',
    lowAttendance: false
  });

  const [editSession, setEditSession] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showLogs, setShowLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchAuditLogs = async () => {
    try {
      const { data } = await axios.get('/api/audit', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setAuditLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs');
    }
  };

  const handleDeleteSession = async (session) => {
    confirmAction({
      title: 'Delete Session?',
      message: 'This will permanently remove this attendance session and create an audit log in the trash.',
      type: 'error',
      onConfirm: async () => {
        try {
          await axios.delete('/api/attendance/session', {
            headers: { Authorization: `Bearer ${user.token}` },
            data: {
              batchId: session.batch?._id,
              date: session.date,
              time: session.time,
              sessionType: session.sessionType,
              subject: session.subject
            }
          });
          showNotification('Session deleted and logged successfully', 'success');
          fetchReports();
        } catch (error) {
          showNotification(error.response?.data?.message || 'Failed to delete session', 'error');
        }
      }
    });
  };

  const handleDeleteLog = async (logId) => {
    try {
      await axios.delete(`/api/audit/${logId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchAuditLogs();
      showNotification('Log entry deleted', 'success');
    } catch (error) {
      showNotification('Failed to delete log', 'error');
    }
  };

  const handleRestoreSession = async (logId) => {
    try {
      await axios.post(`/api/audit/restore/${logId}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchAuditLogs();
      fetchReports();
      showNotification('Session restored successfully', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to restore', 'error');
    }
  };

  const fetchMetadata = async () => {
    try {
      const { data } = await axios.get('/api/reports/filters-metadata', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setAllSubjects(data.subjects || []);
      setAllYears(data.years || []);
      setAllTeachers(data.teachers || []);
      setAllDepts(data.departments || []);
      
      setAllStudents(data.students || []);
    } catch (error) {
       console.error("Meta fetch error", error);
    }
  };

  const fetchReports = async (customFilters = null) => {
    try {
      const activeFilters = customFilters || filters;
      const queryParams = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, val]) => {
        if (val) queryParams.append(key, val);
      });

      const { data } = await axios.get(`/api/reports/attendance?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  useEffect(() => {
    if (user && user.token) {
      if (user.role === 'Teacher') {
        const initialFilters = {
          ...filters,
          teacher: user._id
        };
        setFilters(initialFilters);
        fetchMetadata(); // Ensure modal has their data
        fetchReports(initialFilters);
      } else if (user.role === 'HOD') {
        const initialFilters = {
          ...filters,
          department: user.department?.[0] || '',
        };
        setFilters(initialFilters);
        fetchMetadata(); // Populate modal dropdowns
        fetchReports(initialFilters);
      } else {
        fetchMetadata();
        fetchReports();
      }
    }
  }, [user]);

  const onFilterChange = (key, value) => {
    const updatedFilters = { ...filters, [key]: value };
    if (key === 'department') updatedFilters.subject = ''; // Reset subject on dept change
    setFilters(updatedFilters);
    setCurrentPage(1); // Reset to first page on filter change
    fetchReports(updatedFilters);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReports();
  };

  const handleDownloadCSV = async () => {
    try {
      const leadershipRoles = ['Principal', 'Vice-Principal', 'HOD'];
      const targetDepts = (leadershipRoles.includes(user.role) && !filters.department) 
        ? (user.role === 'HOD' ? [user.department?.[0]] : allDepts)
        : [filters.department];

      const academicYears = allYears.length > 0 ? allYears : ['F.Y', 'S.Y', 'T.Y', 'Final Year'];

      for (const deptVal of targetDepts) {
        let combinedCSVRows = [];
        let globalFields = new Set(['Year', 'Roll Number', 'Student Name', 'Department']);

        for (const yearVal of academicYears) {
            const queryParams = new URLSearchParams({ ...filters, department: deptVal, year: yearVal });
            const { data } = await axios.get(`/api/reports/attendance?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            if (!data || data.length === 0) continue;

            data.forEach(session => {
                session.records.forEach(rec => {
                    combinedCSVRows.push({
                        'Year': yearVal,
                        'Roll Number': rec.student.rollNumber || 'N/A',
                        'Student Name': rec.student.name,
                        'Department': deptVal,
                        'Subject': session.subject,
                        'Type': session.sessionType,
                        'Date': new Date(session.date).toLocaleDateString(),
                        'Status': rec.status
                    });
                });
            });
        }

        if (combinedCSVRows.length === 0) continue;

        // Convert to CSV (Simple stacking for unified file)
        const header = Object.keys(combinedCSVRows[0]).join(',');
        const rows = combinedCSVRows.map(r => Object.values(r).join(',')).join('\n');
        const csvContent = `${header}\n${rows}`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Unified_Report_${deptVal.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await new Promise(r => setTimeout(r, 800));
      }

      setIsDownloadModalOpen(false);
      showNotification('Unified Departmental CSVs Generated!', 'success');
    } catch (error) {
      showNotification('CSV Export Error', 'error');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const leadershipRoles = ['Principal', 'Vice-Principal', 'HOD'];
      const targetDepts = (leadershipRoles.includes(user.role) && !filters.department) 
        ? (user.role === 'HOD' ? [user.department?.[0]] : allDepts)
        : [filters.department];

      const academicYears = allYears.length > 0 ? allYears : ['F.Y', 'S.Y', 'T.Y', 'Final Year'];

      for (const deptVal of targetDepts) {
        if (!deptVal) continue;
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        let reportHasData = false;

        for (let i = 0; i < academicYears.length; i++) {
            const yearVal = academicYears[i];
            const queryParams = new URLSearchParams({ ...filters, department: deptVal, year: yearVal });
            
            const { data } = await axios.get(`/api/reports/attendance?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            if (!data || data.length === 0) continue;
            if (reportHasData) doc.addPage();
            reportHasData = true;

            // 1. Final Image Style Header (Department Title + Yellow Bar)
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(16); doc.setFont('helvetica', 'bold');
            doc.text(`Department of ${deptVal}`, 148, 12, { align: 'center' });
            
            // Yellow Bar for Date Range
            doc.setFillColor(255, 255, 100); // Yellow
            doc.rect(10, 16, 277, 8, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            const dateStr = `Attendance (${filters.startDate || 'Start'} to ${filters.endDate || 'End'})`;
            doc.text(dateStr, 148, 21.5, { align: 'center' });
            
            doc.setFontSize(8); doc.setTextColor(71, 85, 105);
            doc.text(`${yearVal} ACADEMIC YEAR - Cumulative Matrix | Gen: ${new Date().toLocaleDateString()}`, 10, 29);

            // 2. Aggregate Data - Use FULL Subject List for department + specific year
            const fullDeptSubjects = new Set();
            const deptTeachersInContext = allTeachers.filter(t => 
                t.department?.some(d => d.toLowerCase() === deptVal.toLowerCase()) &&
                t.year?.some(y => y.toLowerCase() === yearVal.toLowerCase())
            );
            deptTeachersInContext.forEach(t => {
                if (t.subject) t.subject.forEach(s => fullDeptSubjects.add(s));
            });
            const theorySubjects = Array.from(fullDeptSubjects).sort();

            // For Practical, only show subjects that actually have practical data in this set
            const practicalSubjectsSet = new Set();
            data.forEach(session => {
                if (session.sessionType === 'Practical' && session.subject) {
                    practicalSubjectsSet.add(session.subject);
                }
            });
            const practicalSubjects = Array.from(practicalSubjectsSet).sort();

            const studentsSummary = {};
            const deptEngagedT = {}; 
            const deptEngagedP = {}; 

            data.forEach(session => {
                const sub = session.subject;
                if (session.sessionType === 'Lecture') {
                    deptEngagedT[sub] = (deptEngagedT[sub] || 0) + 1;
                } else {
                    deptEngagedP[sub] = (deptEngagedP[sub] || 0) + 1;
                }

                session.records.forEach(rec => {
                    const sid = rec.student._id;
                    if (!studentsSummary[sid]) {
                        studentsSummary[sid] = { roll: rec.student.rollNumber || 'N/A', name: rec.student.name, theory: {}, practical: {} };
                    }
                    if (rec.status === 'Present') {
                        const type = session.sessionType === 'Lecture' ? 'theory' : 'practical';
                        studentsSummary[sid][type][sub] = (studentsSummary[sid][type][sub] || 0) + 1;
                    }
                });
            });
            
            // 3. Hierarchical Headers & Meta Row
            const theoryColCount = theorySubjects.length;
            const practicalColCount = practicalSubjects.length;

            const h1 = [
                { content: '', colSpan: 2, styles: { fillColor: [51, 65, 85] } },
                { content: 'Theory Attendance Sessions', colSpan: theoryColCount + 1, styles: { halign: 'center', fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' } },
                { content: 'Practical Attendance Sessions', colSpan: practicalColCount + 1, styles: { halign: 'center', fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' } },
                { content: '', colSpan: 1, styles: { fillColor: [51, 65, 85] } }
            ];

            const h2 = [
                { content: 'Roll No', styles: { textColor: [153, 27, 27], fontStyle: 'bold' } },
                { content: 'Name of the Student', styles: { textColor: [153, 27, 27], fontStyle: 'bold' } },
                ...theorySubjects, 
                { content: 'TOTAL', styles: { textColor: [153, 27, 27], fontStyle: 'bold' } },
                ...practicalSubjects, 
                { content: 'TOTAL', styles: { textColor: [153, 27, 27], fontStyle: 'bold' } },
                { content: '% ATTD.', styles: { textColor: [153, 27, 27], fontStyle: 'bold' } },
                'Status'
            ];
            
            let totalTOverall = 0; theorySubjects.forEach(s => totalTOverall += (deptEngagedT[s] || 0));
            let totalPOverall = 0; practicalSubjects.forEach(s => totalPOverall += (deptEngagedP[s] || 0));

            const metaRow = [{ content: 'Lect. Engaged', colSpan: 2, styles: { fillColor: [254, 242, 242], textColor: [153, 27, 27], fontStyle: 'bold', halign: 'center' } }];
            theorySubjects.forEach(s => metaRow.push({ content: (deptEngagedT[s] || 0).toString(), styles: { textColor: [153, 27, 27], fontStyle: 'bold', halign: 'center', fillColor: [254, 242, 242] } }));
            metaRow.push({ content: totalTOverall.toString(), styles: { textColor: [153, 27, 27], fontStyle: 'bold', halign: 'center', fillColor: [255, 228, 230] } });
            practicalSubjects.forEach(s => metaRow.push({ content: (deptEngagedP[s] || 0).toString(), styles: { textColor: [153, 27, 27], fontStyle: 'bold', halign: 'center', fillColor: [254, 242, 242] } }));
            metaRow.push({ content: totalPOverall.toString(), styles: { textColor: [153, 27, 27], fontStyle: 'bold', halign: 'center', fillColor: [255, 228, 230] } });
            metaRow.push({ content: '', colSpan: 2, styles: { fillColor: [254, 242, 242] } });

            // 4. Student Rows
            const tableRows = [metaRow];
            Object.values(studentsSummary).sort((a,b) => a.roll.localeCompare(b.roll)).forEach(s => {
                const row = [s.roll, s.name];
                let sTotalT = 0, sTotalP = 0;
                
                theorySubjects.forEach(sub => { let c = s.theory[sub] || 0; row.push(c); sTotalT += c; });
                row.push({ content: sTotalT.toString(), styles: { textColor: [153, 27, 27], fontStyle: 'bold' } });
                practicalSubjects.forEach(sub => { let c = s.practical[sub] || 0; row.push(c); sTotalP += c; });
                row.push({ content: sTotalP.toString(), styles: { textColor: [153, 27, 27], fontStyle: 'bold' } });

                const gT = totalTOverall + totalPOverall;
                const gP = sTotalT + sTotalP;
                const perc = gT > 0 ? Math.round((gP/gT)*100) : 0;
                row.push({ content: `${perc}%`, styles: { textColor: perc < 76 ? [220, 38, 38] : [15, 23, 42], fontStyle: 'bold' } });
                
                let status = 'GOOD';
                if (perc < 76) status = 'DEFAULTER';
                else if (perc > 85) status = 'EXCELLENT';
                
                row.push({ 
                    content: status, 
                    styles: status === 'DEFAULTER' ? { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' } : 
                            status === 'EXCELLENT' ? { textColor: [22, 163, 74], fontStyle: 'bold' } : {}
                });

                tableRows.push(row);
            });

            autoTable(doc, {
                startY: 40,
                head: [h1, h2],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [255, 255, 255], textColor: [51, 65, 85], fontSize: 6.5, halign: 'center', lineWidth: 0.1 },
                bodyStyles: { fontSize: 6.5, textColor: [15, 23, 42], lineWidth: 0.1 },
                columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 35 } },
                didParseCell: (data) => {
                    if (data.section === 'head' && data.row.index === 0) {
                        data.cell.styles.fillColor = [51, 65, 85];
                    }
                }
            });
        }

        if (reportHasData) {
            doc.save(`Cumulative_Matrix_${deptVal.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      setIsDownloadModalOpen(false);
      showNotification('Unified Matrix Report stacking correctly!', 'success');
    } catch (error) {
       showNotification('Matrix report generation failed.', 'error');
    }
  };

  const handleEditStatusToggle = (studentId) => {
    setEditSession(prev => ({
      ...prev,
      records: prev.records.map(r => 
        r.student._id === studentId 
          ? { ...r, status: r.status === 'Present' ? 'Absent' : 'Present' }
          : r
      )
    }));
  };

  const saveAttendanceEdits = async () => {
    setIsUpdating(true);
    try {
      await axios.put('/api/attendance/session', {
        batchId: editSession.batch?._id,
        date: editSession.date,
        time: editSession.time,
        sessionType: editSession.sessionType,
        records: editSession.records.map(r => ({ student: r.student._id, status: r.status }))
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showNotification('Attendance Updated Successfully!', 'success');
      setEditSession(null);
      fetchReports();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update records', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const availableTeachers = useMemo(() => {
    if (user.role === 'HOD') return allTeachers; 
    if (!filters.department) return allTeachers;
    return allTeachers.filter(t => 
      t.department && t.department.some(d => d.toLowerCase() === filters.department.toLowerCase())
    );
  }, [allTeachers, filters.department, user.role]);

  const availableSubjects = useMemo(() => {
    if (filters.teacher) {
      const selectedTeacher = allTeachers.find(t => t._id === filters.teacher);
      if (selectedTeacher && selectedTeacher.subject && selectedTeacher.subject.length > 0) {
        return selectedTeacher.subject;
      }
    }

    // If department is selected but no teacher, filter subjects taught by any teacher in that department
    if (filters.department) {
        const subjects = new Set();
        availableTeachers.forEach(t => {
            if (t.subject) t.subject.forEach(s => subjects.add(s));
        });
        return Array.from(subjects).sort();
    }

    return allSubjects;
  }, [allSubjects, allTeachers, filters.teacher, filters.department, availableTeachers]);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentReports = reports.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(reports.length / recordsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 relative">
      {/* Attendance Edit Modal */}
      {editSession && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter">Correct Attendance</h2>
                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mt-1">
                  {editSession.batch?.batchName || editSession.subject} | {new Date(editSession.date).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setEditSession(null)} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-10 py-4 bg-slate-950/20 border-y border-slate-800 flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               </div>
               <input 
                 type="text" 
                 placeholder="Search student by name or roll number..." 
                 className="flex-1 bg-transparent border-none text-sm font-semibold text-white focus:ring-0 outline-none placeholder:text-slate-600"
                 value={editSession.search || ''}
                 onChange={(e) => setEditSession({...editSession, search: e.target.value})}
               />
            </div>

            <div className="px-10 max-h-[50vh] overflow-y-auto space-y-4 py-8">
              {editSession.records.filter(r => 
                !editSession.search || 
                r.student.name.toLowerCase().includes(editSession.search.toLowerCase()) || 
                r.student.rollNumber?.toLowerCase().includes(editSession.search.toLowerCase())
              ).map((record) => (
                <div key={record.student._id} className="flex justify-between items-center p-5 bg-slate-800/40 rounded-2xl border border-slate-700/50 group hover:border-secondary/30 transition-all">
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight">{record.student.name}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Roll No: {record.student.rollNumber || 'N/A'}</p>
                  </div>
                  <button 
                    onClick={() => handleEditStatusToggle(record.student._id)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      record.status === 'Present' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}
                  >
                    {record.status}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-10 border-t border-slate-800 bg-slate-900/50 flex gap-4">
               <button onClick={() => setEditSession(null)} className="flex-1 px-8 py-5 rounded-3xl border border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-800 transition-all">Cancel</button>
               <button 
                 onClick={saveAttendanceEdits}
                 disabled={isUpdating}
                 className="flex-1 px-8 py-5 rounded-3xl bg-secondary text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-secondary/90 transition-all shadow-xl shadow-secondary/10 disabled:opacity-50"
               >
                 {isUpdating ? 'Synchronizing...' : 'Commit Changes'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal Overlay */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Download Attendance Report</h2>
              </div>
              <button onClick={() => setIsDownloadModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Start Date</label>
                    <input type="date" max={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})}/>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">End Date</label>
                    <input type="date" max={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})}/>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {user.role !== 'HOD' && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Department</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700" value={filters.department} onChange={e => setFilters({...filters, department: e.target.value, subject: '', teacher: ''})}>
                        {user.role === 'Teacher' ? (
                          user.department?.map(d => <option key={d} value={d}>{d}</option>)
                        ) : (
                          <>
                            <option value="">All Departments</option>
                            {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
                          </>
                        )}
                      </select>
                   </div>
                 )}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Class / Year</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700" value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})}>
                      {user.role === 'Teacher' ? (
                        user.year?.map(y => <option key={y} value={y}>{y}</option>)
                      ) : (
                        <>
                          <option value="">All Classes</option>
                          <option value="F.Y">F.Y (First Year)</option>
                          <option value="S.Y">S.Y (Second Year)</option>
                          <option value="T.Y">T.Y (Third Year)</option>
                          <option value="Final Year">Final Year</option>
                        </>
                      )}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Session Type</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700" value={filters.sessionType} onChange={e => setFilters({...filters, sessionType: e.target.value})}>
                    <option value="">All Types</option>
                    <option value="Lecture">Lecture Only</option>
                    <option value="Practical">Practical Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Specific Time (Optional)</label>
                  <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700" value={filters.time} onChange={e => setFilters({...filters, time: e.target.value})}/>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Specific Teacher</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700" value={filters.teacher} onChange={e => setFilters({...filters, teacher: e.target.value, subject: ''})}>
                  {user.role === 'Teacher' ? (
                    <option value={user._id}>{user.name}</option>
                  ) : (
                    <>
                      <option value="">All Instructional Staff</option>
                      {availableTeachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Subject</label>
                 <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700" value={filters.subject} onChange={e => setFilters({...filters, subject: e.target.value})}>
                    {user.role === 'Teacher' ? (
                      user.subject?.map(s => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <>
                         <option value="">All Subjects (Default)</option>
                         {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </>
                    )}
                 </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Specific Student Search</label>
                <div className="relative">
                   <input 
                      list="student-list-options"
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 text-sm font-semibold text-slate-700 placeholder:text-slate-400" 
                      placeholder="Enter Name, Email, or Roll No..."
                      value={filters.studentSearch} 
                      onChange={e => setFilters({...filters, studentSearch: e.target.value})}
                   />
                   <datalist id="student-list-options">
                     {allStudents.map(s => (
                       <option key={s._id} value={s.name}>
                         {s.email} {s.rollNumber ? `| Roll: ${s.rollNumber}` : ''}
                       </option>
                     ))}
                   </datalist>
                   <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/20">
               <button onClick={() => setIsDownloadModalOpen(false)} className="px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs">Cancel</button>
               <button onClick={handleDownloadCSV} className="flex-1 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-600/30">Download CSV</button>
               <button onClick={handleDownloadPDF} className="flex-1 px-6 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-rose-600/30">Download PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex justify-between items-center bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Analytical Reports</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2 italic pl-1 border-l-2 border-secondary/40">Global attendance overview and data export</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setShowLogs(true);
              fetchAuditLogs();
            }}
            className="px-6 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
          >
            View Trash Logs
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { fetchMetadata(); fetchReports(); }}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700 flex items-center gap-2 group"
              title="Force Data Sync"
            >
              <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Sync Data</span>
            </button>
            <button 
              onClick={() => {
                setIsDownloadModalOpen(true);
                if (user.role !== 'Teacher') fetchMetadata();
              }}
              className="flex items-center gap-3 bg-gradient-to-br from-secondary to-secondary-dark text-white px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-secondary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Reports
            </button>
          </div>
        </div>
      </div>

      {user.role !== 'Teacher' && user.role !== 'HOD' && (
        <div className="glass-card !p-10 border-slate-800/40">
          <form onSubmit={handleFilterSubmit} className={`grid grid-cols-1 md:grid-cols-2 ${user.role === 'HOD' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-8`}>
            <div className="form-group">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Quick Search</label>
              <input type="text" className="form-input" placeholder="Name or Roll No..." value={filters.studentSearch} onChange={e => setFilters({...filters, studentSearch: e.target.value})} />
            </div>
            {user.role !== 'HOD' && (
              <div className="form-group">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Department</label>
                <input type="text" className="form-input" value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} />
              </div>
            )}
            <div className="form-group">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Subject Key</label>
              <input type="text" className="form-input" value={filters.subject} onChange={e => setFilters({...filters, subject: e.target.value})} />
            </div>
            <div className="flex items-end pb-1 gap-4">
               <button type="submit" className="btn btn-primary h-12 flex-1 px-8 text-xs font-black uppercase tracking-widest uppercase">Apply Filters</button>
               <label className="flex items-center gap-3 cursor-pointer group mb-3">
                  <input type="checkbox" className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary" checked={filters.lowAttendance} onChange={e => setFilters({...filters, lowAttendance: e.target.checked})} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Low Atnd.</span>
               </label>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card !p-0 overflow-hidden shadow-2xl border-slate-800/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Session & Year</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Teacher & Dept</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Stats</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {currentReports.map((session, i) => {
                const total = session.records.length;
                const present = session.records.filter(r => r.status === 'Present').length;
                const percentage = Math.round((present / total) * 100);
                const canEdit = user.role === 'Teacher' || user.role === 'Admin';

                return (
                  <tr key={i} className="hover:bg-slate-800/20 transition-all group">
                    <td className="px-8 py-6">
                      <p className="text-white font-bold">{session.batch?.batchName || session.subject || "N/A"}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {new Date(session.date).toLocaleDateString()} @ {session.time}
                        </p>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">{session.year || "Year N/A"}</p>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <p className="text-[9px] font-black text-secondary uppercase tracking-widest italic">{session.sessionType}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2">{session.teacher?.name || "Unassigned"}</p>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                        {session.department || session.batch?.department || "N/A"}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`text-xl font-black ${percentage < 75 ? 'text-red-500' : 'text-emerald-500'}`}>{percentage}%</p>
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Attendance</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex items-center justify-end gap-3">
                        {canEdit ? (
                          <>
                            <button 
                              onClick={() => setEditSession(session)}
                              className="px-6 py-2 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white border border-secondary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Correct
                            </button>
                            <button 
                              onClick={() => handleDeleteSession(session)}
                              className="px-6 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">Read Only</span>
                        )}
                       </div>
                    </td>
                  </tr>
                );
              })}
              {reports.length === 0 && (
                <tr>
                   <td colSpan="5" className="px-8 py-24 text-center text-slate-600 italic font-black uppercase text-[10px] tracking-[0.2em] leading-relaxed">
                      No Lecture or Practical attendance reports <br/> present for the selected criteria.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {reports.length > 0 && (
          <div className="px-8 py-6 bg-slate-900/50 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Showing <span className="text-white">{Math.min(indexOfFirstRecord + 1, reports.length)}</span> - <span className="text-white">{Math.min(indexOfLastRecord, reports.length)}</span> of <span className="text-white">{reports.length}</span> Records
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNum = idx + 1;
                  if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => paginate(pageNum)}
                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                          currentPage === pageNum 
                            ? 'bg-secondary text-white shadow-lg shadow-secondary/20' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="text-slate-600 px-1 text-[10px]">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                type="button"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trash Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                 <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter">Deletion Logs (Trash)</h2>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mt-1">Audit Trail of Removed Attendance Records</p>
                 </div>
                 <button onClick={() => setShowLogs(false)} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="p-10 max-h-[60vh] overflow-y-auto space-y-4">
                 {auditLogs.length === 0 && <p className="text-center py-20 text-slate-600 uppercase font-black text-[10px] tracking-widest">No deletion logs found.</p>}
                 {auditLogs.map((log) => (
                    <div key={log._id} className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex justify-between items-center group">
                       <div>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded">DELETED</span>
                             <p className="text-sm font-bold text-white">{log.details.subject} | {log.details.type}</p>
                          </div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                             Date: {new Date(log.details.date).toLocaleDateString()} | Records: {log.details.recordCount}
                          </p>
                          <p className="text-[9px] font-medium text-slate-400 mt-1 italic">Deleted by {log.performedBy?.name} on {new Date(log.timestamp).toLocaleString()}</p>
                       </div>
                       <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleRestoreSession(log._id)}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white"
                        >
                           Restore
                        </button>
                        <button 
                          onClick={() => handleDeleteLog(log._id)}
                          className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                       </div>
                    </div>
                 ))}
              </div>
              
              <div className="p-10 border-t border-slate-800 bg-slate-900/50 text-center">
                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
                    Note: Logs are permanent records. Deleting a log entry here will <br/> permanently remove the audit evidence.
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
