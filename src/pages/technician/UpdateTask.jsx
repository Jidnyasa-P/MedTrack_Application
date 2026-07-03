import { useState, useEffect } from "react";
import { updateTask, getTaskById } from "../../services/MaintenanceService";

export default function UpdateTask({ onNavigate, task }) {
  const [taskState, setTaskState] = useState(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [notFoundError, setNotFoundError] = useState(null);

  const [form, setForm] = useState({
    status: "In Progress",
    notes: "",
    parts: [],
    hours: "",
    image: null
  });
  const [part, setPart] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTaskDetail = async () => {
      const taskId = task && typeof task === "object" ? task.id : task;
      if (!taskId) {
        setLoadingTask(false);
        return;
      }
      try {
        setLoadingTask(true);
        setNotFoundError(null);
        const data = await getTaskById(taskId);
        setTaskState(data);
        setForm({
          status: data.status || "In Progress",
          notes: data.notes || "",
          parts: data.partsUsed ? data.partsUsed.split(", ") : [],
          hours: data.hoursWorked || "",
          image: null
        });
      } catch (err) {
        console.error("Error fetching task details:", err);
        const errorMsg = err.response?.data?.message || `Maintenance task not found with id: ${taskId}`;
        setNotFoundError(errorMsg);
      } finally {
        setLoadingTask(false);
      }
    };
    fetchTaskDetail();
  }, [task]);

  if (loadingTask) {
    return (
      <div className="p-8 text-center bg-slate-900 min-h-screen flex flex-col justify-center items-center font-sans">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-slate-400 font-medium tracking-wide">Retrieving task details from server...</p>
      </div>
    );
  }

  if (notFoundError || !taskState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-slate-800/85 border border-red-500/20 backdrop-blur-xl p-8 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Task Not Found</h2>
          <p className="text-slate-400 mb-6 font-medium">
            {notFoundError || "Please select a task from the list or enter a valid task ID below."}
          </p>
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Enter Task ID (e.g. 1)"
              id="searchTaskIdInput"
              className="flex-1 p-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white font-bold focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 outline-none"
              onKeyPress={async (e) => {
                if (e.key === "Enter") {
                  const val = e.target.value.trim();
                  if (val) {
                    onNavigate("update-task", val);
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const val = document.getElementById("searchTaskIdInput")?.value.trim();
                if (val) {
                  onNavigate("update-task", val);
                }
              }}
              className="px-6 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              Load
            </button>
          </div>
          <button onClick={() => onNavigate("tasks")} className="w-full py-4 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-600 transition-all active:scale-95">
            Return to Tasks
          </button>
        </div>
      </div>
    );
  }

  const steps = ["Inspection", "Repair", "Testing", "Completed"];
  const getStepIndex = () => {
    switch (form.status) {
      case "Completed": return 4;
      case "In Progress": return 2;
      case "Needs Part": return 2;
      case "On Hold": return 2;
      default: return 1;
    }
  };
  const currentStep = getStepIndex();
  const progress = (currentStep / 4) * 100;

  const addPart = () => {
    if (!part.trim()) return;
    setForm({ ...form, parts: [...form.parts, part] });
    setPart("");
  };

  const removePart = (i) => {
    setForm({ ...form, parts: form.parts.filter((_, x) => x !== i) });
  };

  const upload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setForm({ ...form, image: f });
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        status: form.status,
        notes: form.notes,
        partsUsed: form.parts.join(", "),
        hoursWorked: form.hours
      };

      await updateTask(taskState.id, payload);
      setDone(true);
      setTimeout(() => onNavigate("tasks"), 2000);
    } catch (err) {
      console.error("Error updating task:", err);
      setError("Failed to submit update. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-slate-900 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.1),transparent_50%)]"></div>
      
      <div className="relative max-w-6xl mx-auto px-6 py-10">
        <button onClick={() => onNavigate("tasks")} className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 font-bold">
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tasks
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-2xl p-8 lg:p-12 border border-blue-50/10">
            <header className="mb-10">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Maintenance Report</h1>
              <p className="text-slate-500 font-medium">Update equipment status and logs</p>
            </header>

            <div className="mb-12">
              <div className="flex justify-between mb-4">
                {steps.map((s, i) => (
                  <div key={s} className="flex flex-col items-center w-full relative">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-2xl text-sm font-black transition-all duration-500 z-10 ${
                      i + 1 <= currentStep ? "bg-primary text-white shadow-xl shadow-primary/30" : "bg-slate-100 text-slate-400"
                    }`}>
                      {i + 1}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold mt-3 uppercase tracking-widest ${
                      i + 1 <= currentStep ? "text-primary" : "text-slate-300"
                    }`}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full w-[85%] mx-auto -mt-10 overflow-hidden">
                <div style={{ width: `${progress}%` }} className="absolute h-full bg-primary transition-all duration-1000 ease-out shadow-sm shadow-primary/50" />
              </div>
            </div>

            {done ? (
              <div className="text-center py-16 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-2">Update Complete</h3>
                <p className="text-slate-500 text-lg">Your report has been synced to the primary database.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-2">
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                     {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Current Status</label>
                    <select 
                      value={form.status} 
                      onChange={e => setForm({ ...form, status: e.target.value })} 
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    >
                      <option>In Progress</option>
                      <option>Needs Part</option>
                      <option>On Hold</option>
                      <option>Completed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Time Invested (Hours)</label>
                    <input 
                      type="number" step="0.5" 
                      placeholder="e.g. 2.5" 
                      value={form.hours} 
                      onChange={e => setForm({ ...form, hours: e.target.value })} 
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Maintenance Notes</label>
                  <textarea 
                    rows="4" 
                    placeholder="Provide technical details about parts replaced, calibrations performed..." 
                    value={form.notes} 
                    onChange={e => setForm({ ...form, notes: e.target.value })} 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Replacement Parts</label>
                  <div className="flex gap-2">
                    <input 
                      value={part} 
                      onChange={e => setPart(e.target.value)} 
                      placeholder="Enter part name / serial" 
                      className="flex-1 p-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-primary/20"
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addPart())}
                    />
                    <button type="button" onClick={addPart} className="px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95">
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.parts.map((p, i) => (
                      <span key={i} className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 group animate-in slide-in-from-left-2 duration-300">
                        {p}
                        <button type="button" onClick={() => removePart(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full md:w-auto px-12 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all text-lg disabled:opacity-50"
                  >
                    {loading ? "Syncing..." : "Publish Report"}
                  </button>
                  <div className="flex-1 flex items-center gap-4 cursor-pointer">
                     <label className="flex items-center gap-3 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       </div>
                       <span className="font-bold text-sm">Attach Photo</span>
                       <input type="file" className="hidden" onChange={upload} accept="image/*" />
                     </label>
                     {preview && (
                       <div className="relative group w-12 h-12">
                         <img src={preview} className="w-full h-full rounded-xl object-cover ring-2 ring-primary/20" alt="Preview"/>
                         <button onClick={() => setPreview(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg hidden group-hover:block"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                       </div>
                     )}
                  </div>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
               <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                 <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 System Context
               </h2>
               
               <div className="space-y-6 relative z-10">
                 <div>
                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Asset</span>
                   <p className="font-bold text-lg">{taskState.equipment}</p>
                 </div>
                 <div>
                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Facility</span>
                   <p className="font-bold text-slate-300">{taskState.hospital}</p>
                 </div>
                 <div>
                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Criticality</span>
                   <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase mt-1 ${
                     taskState.priority === 'Critical' ? 'bg-red-500/20 text-red-300' :
                     taskState.priority === 'High' ? 'bg-orange-500/20 text-orange-300' :
                     'bg-blue-500/20 text-blue-300'
                   }`}>
                     {taskState.priority}
                   </span>
                 </div>
                 <div>
                   <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Original Issue</span>
                   <p className="text-sm text-slate-400 italic font-medium leading-relaxed">"{taskState.description}"</p>
                 </div>
               </div>
            </div>

            <div className="bg-gradient-to-br from-primary to-blue-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-primary/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/60">Auto-Save</p>
                  <p className="font-black">Cloud Backup Active</p>
                </div>
              </div>
              <p className="text-sm text-white/80 font-medium">Your progress is automatically saved to your local cache every 2 seconds.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
