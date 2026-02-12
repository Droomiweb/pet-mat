"use client";

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styles
import Link from 'next/link';

// Custom styles for Calendar
const calendarStyles = `
  .react-calendar {
    width: 100%;
    background: white;
    border: none;
    font-family: inherit;
    line-height: 1.125em;
    border-radius: 1rem;
    padding: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  .react-calendar__tile {
    height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding-top: 10px;
  }
  .react-calendar__tile--active {
    background: #4A90E2 !important;
    color: white;
  }
`;

export default function AIActivityLogs() {
  const [date, setDate] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ success: 0, failed: 0 });
  const [providerStats, setProviderStats] = useState({
      gemini: { count: 0, success: 0, failed: 0 },
      groq: { count: 0, success: 0, failed: 0 },
      huggingface: { count: 0, success: 0, failed: 0 },
  });
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch Monthly Data for Calendar
  const fetchMonthlyData = async (activeDate) => {
    const year = activeDate.getFullYear();
    const month = activeDate.getMonth() + 1; // 1-12
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    
    try {
      const res = await fetch(`/api/admin/ai-stats?month=${monthStr}`);
      const data = await res.json();
      if (res.ok) setCalendarData(data.calendarData || {});
    } catch (e) {
      console.error("Failed to fetch monthly stats", e);
    }
  };

  // Helper to format date as YYYY-MM-DD in LOCAL TIME
  const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  // Fetch Daily Logs
  const fetchDailyLogs = async (selectedDate) => {
    setLoading(true);
    const dateStr = formatLocalDate(selectedDate); // Use Local Date
    try {
      const res = await fetch(`/api/admin/ai-stats?date=${dateStr}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setStats(data.stats || { success: 0, failed: 0 });
        if (data.providerStats) setProviderStats(data.providerStats);
      }
    } catch (e) {
      console.error("Failed to fetch daily logs", e);
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchMonthlyData(date);
    fetchDailyLogs(date);
  }, []);

  const handleDateChange = (newDate) => {
    setDate(newDate);
    fetchDailyLogs(newDate);
    // If month changed, refetch calendar data
    if (newDate.getMonth() !== date.getMonth()) {
      fetchMonthlyData(newDate);
    }
  };

  // Custom tile content for Calendar
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatLocalDate(date); // Use Local Date
      const data = calendarData[dateStr];
      if (data) {
        return (
          <div className="flex flex-col items-center mt-1">
             <span className="text-xs font-bold text-gray-500">{data.count}</span>
             {data.failed > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-[#F3F4F6] overflow-hidden">
      <style>{calendarStyles}</style>

      {/* Header */}
      <div className="bg-white shadow-sm z-10 p-4 border-b border-gray-200 shrink-0">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
            <Link href="/admin" className="text-xs font-bold text-[#4A90E2] hover:underline mb-1 inline-block">← Back to Admin</Link>
            <h1 className="text-2xl font-extrabold text-[#333333] flex items-center gap-2">
                🤖 AI Activity Monitor 
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{mounted ? date.toLocaleDateString() : '...'}</span>
            </h1>
            </div>
            
            {/* Model Summary Cards (Mini) */}
            <div className="flex gap-4">
               {/* Gemini */}
               <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg flex flex-col items-center w-28">
                   <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">Gemini</div>
                   <div className="text-lg font-black text-blue-600">{providerStats.gemini?.count || 0}</div>
                   <div className="flex gap-2 text-[10px]">
                       <span className="text-green-600">✓ {providerStats.gemini?.success || 0}</span>
                       <span className="text-red-600">✗ {providerStats.gemini?.failed || 0}</span>
                   </div>
               </div>
               
               {/* Groq */}
               <div className="bg-orange-50 border border-orange-100 p-2 rounded-lg flex flex-col items-center w-28">
                   <div className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">Groq</div>
                   <div className="text-lg font-black text-orange-600">{providerStats.groq?.count || 0}</div>
                   <div className="flex gap-2 text-[10px]">
                       <span className="text-green-600">✓ {providerStats.groq?.success || 0}</span>
                       <span className="text-red-600">✗ {providerStats.groq?.failed || 0}</span>
                   </div>
               </div>

               {/* HF */}
               <div className="bg-yellow-50 border border-yellow-100 p-2 rounded-lg flex flex-col items-center w-28">
                   <div className="text-[10px] font-bold text-yellow-800 uppercase tracking-wide">HuggingFace</div>
                   <div className="text-lg font-black text-yellow-600">{providerStats.huggingface?.count || 0}</div>
                   <div className="flex gap-2 text-[10px]">
                       <span className="text-green-600">✓ {providerStats.huggingface?.success || 0}</span>
                       <span className="text-red-600">✗ {providerStats.huggingface?.failed || 0}</span>
                   </div>
               </div>
            </div>
          </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 overflow-hidden">
        
        {/* Left: Calendar (Fixed) */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
           <div className="bg-white rounded-2xl shadow-sm p-2 shrink-0">
              <Calendar 
                onChange={handleDateChange} 
                value={date} 
                tileContent={tileContent}
                className="w-full border-none"
              />
           </div>
           
           <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shrink-0">
              <h3 className="font-bold text-blue-100 uppercase text-xs mb-2">Daily Total</h3>
              <div className="text-5xl font-black mb-2">{stats.success + stats.failed}</div>
              <div className="flex gap-4 opacity-90">
                  <span className="text-sm">Success: <b>{stats.success}</b></span>
                  <span className="text-sm">Failed: <b>{stats.failed}</b></span>
              </div>
           </div>
        </div>

        {/* Right: Scrollable Logs */}
        <div className="lg:col-span-8 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                 <h2 className="font-bold text-gray-700 flex items-center gap-2">
                    Activity Stream
                    {loading && <span className="animate-spin ml-2 text-blue-500">↻</span>}
                 </h2>
                 <span className="text-xs text-gray-400">{logs.length} events</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                        <span className="text-4xl mb-2">📜</span>
                        <p>No logs found for this date.</p>
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log._id} className={`group border border-gray-200 rounded-xl transition hover:shadow-md ${selectedLog === log._id ? 'ring-2 ring-blue-500/20' : ''}`}>
                            {/* Log Header */}
                            <div className="p-3 bg-white rounded-xl flex gap-3 cursor-pointer" onClick={() => setSelectedLog(selectedLog === log._id ? null : log._id)}>
                                {/* Status Indicator */}
                                <div className={`flex flex-col items-center justify-center w-12 shrink-0 rounded-lg ${log.status === 'Success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    <span className="text-lg font-bold">{log.status === 'Success' ? '✓' : '✗'}</span>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${log.model.includes('gemini') ? 'bg-blue-500' : log.model.includes('llama') || log.model.includes('groq') ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                                                    {log.model.includes('/') ? log.model.split('/')[1] : log.model}
                                                </span>
                                                <span className="text-xs font-mono text-gray-400">{log.endpoint}</span>
                                            </div>
                                            
                                            {/* User Info Line */}
                                            {log.user ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <img src={log.user.image || '/imgs/user.png'} className="w-4 h-4 rounded-full" alt="u" />
                                                    <span className="text-xs font-semibold text-gray-700">{log.user.name}</span>
                                                    <Link 
                                                       href={`/admin/users/${log.user.firebaseUid}`}
                                                       onClick={(e) => e.stopPropagation()} 
                                                       className="text-[10px] text-blue-500 hover:underline bg-blue-50 px-1.5 py-0.5 rounded"
                                                    >
                                                        Inspect
                                                    </Link>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">Anonymous / System</span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-mono text-gray-500">{new Date(log.createdAt).toLocaleTimeString()}</div>
                                            <div className="text-[10px] text-gray-400">{log.metadata?.latencyMs}ms</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {selectedLog === log._id && (
                                <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm rounded-b-xl animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <strong className="block text-gray-400 text-[10px] uppercase mb-1">Input Prompt</strong>
                                            <div className="bg-white p-3 rounded border border-gray-200 font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap text-gray-600">
                                                {log.input}
                                            </div>
                                        </div>
                                        <div>
                                            <strong className="block text-gray-400 text-[10px] uppercase mb-1">Response Output / Error</strong>
                                            <div className={`bg-white p-3 rounded border border-gray-200 font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap ${log.status === 'Failed' ? 'text-red-600 bg-red-50' : 'text-gray-600'}`}>
                                                {log.output || log.metadata?.error || 'No output'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-400 font-mono">
                                        ID: {log._id} | Tokens: {log.tokens?.total || 0}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
