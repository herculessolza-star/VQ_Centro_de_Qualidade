
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Clock, 
  Settings, 
  BarChart3, 
  UserCircle,
  LogOut,
  Car,
  ShieldAlert,
  FileText,
  Presentation,
  CalendarDays,
  CalendarRange,
  Lock,
  X,
  ArrowRight,
  ChevronDown,
  Download
} from 'lucide-react';
import { Area, CarModel, DefectRecord, DowntimeRecord, OKCarRecord, ViewRole } from './types';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import DowntimeForm from './components/DowntimeForm';
import { exportToExcel } from './services/excelService';
import { generateWhatsAppReport } from './services/reportService';
import { exportDashboardToPDF } from './services/pdfService';
import { generatePPTReport } from './services/pptxService';

const App: React.FC = () => {
  const [role, setRole] = useState<ViewRole | null>(null);
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [okCars, setOkCars] = useState<OKCarRecord[]>([]);
  const [downtime, setDowntime] = useState<DowntimeRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'downtime'>('dashboard');

  // Password Logic State
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Persistence
  useEffect(() => {
    const savedDefects = localStorage.getItem('qc_defects');
    const savedOk = localStorage.getItem('qc_ok_cars');
    const savedDown = localStorage.getItem('qc_downtime');
    
    if (savedDefects) setDefects(JSON.parse(savedDefects));
    if (savedOk) setOkCars(JSON.parse(savedOk));
    if (savedDown) setDowntime(JSON.parse(savedDown));
  }, []);

  useEffect(() => {
    localStorage.setItem('qc_defects', JSON.stringify(defects));
    localStorage.setItem('qc_ok_cars', JSON.stringify(okCars));
    localStorage.setItem('qc_downtime', JSON.stringify(downtime));
  }, [defects, okCars, downtime]);

  const handleAddDefect = (record: Omit<DefectRecord, 'id' | 'timestamp'> & { timestamp?: number }) => {
    const newRecord: DefectRecord = { 
      ...record, 
      id: crypto.randomUUID(), 
      timestamp: record.timestamp || Date.now() 
    };
    setDefects(prev => [newRecord, ...prev]);
  };

  const handleUpdateDefect = (id: string, record: Omit<DefectRecord, 'id' | 'timestamp'> & { timestamp?: number }) => {
    setDefects(prev => prev.map(d => d.id === id ? { ...record, id, timestamp: record.timestamp || d.timestamp } : d));
  };

  const handleRemoveDefect = (id: string) => {
    if (confirm('Deseja realmente apagar este lançamento de defeito?')) {
      setDefects(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleAddOK = (record: Omit<OKCarRecord, 'id' | 'timestamp'> & { timestamp?: number }) => {
    const newRecord: OKCarRecord = { 
      ...record, 
      id: crypto.randomUUID(), 
      timestamp: record.timestamp || Date.now() 
    };
    setOkCars(prev => [newRecord, ...prev]);
  };

  const handleUpdateOK = (id: string, record: Omit<OKCarRecord, 'id' | 'timestamp'> & { timestamp?: number }) => {
    setOkCars(prev => prev.map(o => o.id === id ? { ...record, id, timestamp: record.timestamp || o.timestamp } : o));
  };

  const handleRemoveOK = (id: string) => {
    if (confirm('Deseja realmente apagar este lançamento OK?')) {
      setOkCars(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleAddDowntime = (record: Omit<DowntimeRecord, 'id' | 'timestamp'>) => {
    const newRecord: DowntimeRecord = { ...record, id: crypto.randomUUID(), timestamp: Date.now() };
    setDowntime(prev => [newRecord, ...prev]);
  };

  const handleRemoveDowntime = (id: string) => {
    if (confirm('Deseja realmente apagar este registro de parada?')) {
      setDowntime(prev => prev.filter(d => d.id !== id));
    }
  };

  const clearDailyData = () => {
    if (confirm('Deseja realmente limpar todos os dados do dia?')) {
      setDefects([]);
      setOkCars([]);
      setDowntime([]);
    }
  };

  // Helper para filtrar dados para os relatórios
  const getFilteredData = (days: number) => {
    const now = Date.now();
    const limit = now - (days * 24 * 60 * 60 * 1000);
    return {
      defects: defects.filter(d => d.timestamp >= limit),
      okCars: okCars.filter(o => o.timestamp >= limit),
      downtime: downtime.filter(dt => dt.timestamp >= limit)
    };
  };

  const verifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '654321') {
      setRole('MANAGER');
      setActiveTab('dashboard');
      setShowPasswordPrompt(false);
      setPasswordInput('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {role === null ? (
        <div className="min-h-screen w-full flex items-center justify-center bg-soft-blue-50 p-4">
          <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md text-center border border-soft-blue-100">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-soft-blue-500 rounded-full shadow-lg shadow-soft-blue-100">
                <Car className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-soft-blue-900 mb-2 leading-tight uppercase tracking-tight">Centro de Qualidade</h1>
            <p className="text-soft-blue-400 mb-8 text-xs font-bold uppercase tracking-widest italic">VQ - Qualidade do Veículo</p>
            
            {!showPasswordPrompt ? (
              <div className="space-y-4">
                <p className="text-slate-500 mb-4 font-medium">Escolha seu perfil de acesso</p>
                <button onClick={() => { setRole('OPERATOR'); setActiveTab('entry'); }} className="w-full flex items-center justify-between p-5 border-2 border-soft-blue-50 hover:border-soft-blue-400 rounded-2xl transition-all group hover:bg-soft-blue-50/50">
                  <div className="flex items-center gap-4">
                    <ClipboardCheck className="w-6 h-6 text-soft-blue-300 group-hover:text-soft-blue-500" />
                    <span className="font-bold text-slate-700">Lançamento Operacional</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-soft-blue-500"></div>
                </button>
                <button onClick={() => setShowPasswordPrompt(true)} className="w-full flex items-center justify-between p-5 border-2 border-soft-blue-50 hover:border-soft-blue-400 rounded-2xl transition-all group hover:bg-soft-blue-50/50">
                  <div className="flex items-center gap-4">
                    <LayoutDashboard className="w-6 h-6 text-soft-blue-300 group-hover:text-soft-blue-500" />
                    <span className="font-bold text-slate-700">Gestão de Linhas</span>
                  </div>
                  <Lock className="w-4 h-4 text-slate-300 group-hover:text-soft-blue-500" />
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black text-soft-blue-900 uppercase italic tracking-tighter">Acesso à Gestão</h2>
                  <button onClick={() => { setShowPasswordPrompt(false); setPasswordInput(''); setPasswordError(false); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={verifyPassword} className="space-y-4">
                  <div className="relative">
                    <input type="password" autoFocus value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`w-full p-4 bg-soft-blue-50 border-2 rounded-2xl font-black text-center text-xl tracking-[0.5em] outline-none transition-all ${passwordError ? 'border-rose-400 animate-shake bg-rose-50' : 'border-transparent focus:border-soft-blue-400 focus:bg-white'}`} placeholder="••••••" />
                    {passwordError && <p className="text-[10px] font-black text-rose-500 uppercase mt-2">Senha Incorreta</p>}
                  </div>
                  <button type="submit" className="w-full py-4 bg-soft-blue-600 hover:bg-soft-blue-700 text-white font-black rounded-2xl shadow-xl shadow-soft-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95">
                    <span>CONFIRMAR SENHA</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <nav className="w-full md:w-64 bg-soft-blue-50 text-soft-blue-900 md:min-h-screen flex flex-col border-r border-soft-blue-100 shadow-sm">
            <div className="p-6 border-b border-soft-blue-100 flex items-center gap-3 bg-white/50">
              <ShieldAlert className="w-8 h-8 text-soft-blue-500" />
              <span className="font-black text-lg tracking-tighter uppercase italic">VQ</span>
            </div>
            
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
              <div>
                <div className="px-3 pb-2 text-[10px] font-black text-soft-blue-400 uppercase tracking-widest">Navegação</div>
                {role === 'MANAGER' && (
                  <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-soft-blue-500 text-white shadow-lg shadow-soft-blue-100' : 'hover:bg-soft-blue-100 text-soft-blue-700 font-bold'}`}>
                    <LayoutDashboard size={20} />
                    <span>Painel Geral</span>
                  </button>
                )}
                {role === 'OPERATOR' && (
                  <div className="space-y-1">
                    <button onClick={() => setActiveTab('entry')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'entry' ? 'bg-soft-blue-500 text-white shadow-lg shadow-soft-blue-100' : 'hover:bg-soft-blue-100 text-soft-blue-700 font-bold'}`}>
                      <ClipboardCheck size={20} />
                      <span>Lançar Defeito/OK</span>
                    </button>
                    <button onClick={() => setActiveTab('downtime')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'downtime' ? 'bg-soft-blue-500 text-white shadow-lg shadow-soft-blue-100' : 'hover:bg-soft-blue-100 text-soft-blue-700 font-bold'}`}>
                      <Clock size={20} />
                      <span>Parada de Linha</span>
                    </button>
                  </div>
                )}
              </div>

              {role === 'MANAGER' && (
                <>
                  <div>
                    <div className="px-3 pb-2 text-[10px] font-black text-soft-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <Presentation size={10} /> PPT (Bilingue)
                    </div>
                    <div className="space-y-1">
                      <button onClick={() => generatePPTReport(defects, okCars, downtime, 'WEEKLY')} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-soft-blue-100 text-soft-blue-600 transition-colors text-xs font-bold">
                        <Download size={14} /> PPT Semanal
                      </button>
                      <button onClick={() => generatePPTReport(defects, okCars, downtime, 'MONTHLY')} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-soft-blue-100 text-soft-blue-600 transition-colors text-xs font-bold">
                        <Download size={14} /> PPT Mensal
                      </button>
                      <button onClick={() => generatePPTReport(defects, okCars, downtime, 'ANNUAL')} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-soft-blue-100 text-soft-blue-600 transition-colors text-xs font-bold">
                        <Download size={14} /> PPT Anual
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="px-3 pb-2 text-[10px] font-black text-soft-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={10} /> Planilhas (Excel)
                    </div>
                    <div className="space-y-1">
                      <button onClick={() => exportToExcel(defects, okCars, downtime, "Diario")} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-soft-blue-100 text-soft-blue-600 transition-colors text-xs font-bold">
                        <Download size={14} /> Excel Diário
                      </button>
                      <button onClick={() => {
                        const data = getFilteredData(30);
                        exportToExcel(data.defects, data.okCars, data.downtime, "Mensal");
                      }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-soft-blue-100 text-soft-blue-600 transition-colors text-xs font-bold">
                        <Download size={14} /> Excel Mensal
                      </button>
                      <button onClick={() => {
                        const data = getFilteredData(365);
                        exportToExcel(data.defects, data.okCars, data.downtime, "Anual");
                      }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-soft-blue-100 text-soft-blue-600 transition-colors text-xs font-bold">
                        <Download size={14} /> Excel Anual
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="px-3 pb-2 text-[10px] font-black text-soft-blue-400 uppercase tracking-widest">Comunicação</div>
                    <button onClick={() => generateWhatsAppReport(defects, okCars, downtime)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
                      <ShieldAlert size={20} />
                      <span className="text-xs font-bold uppercase">Zap Report</span>
                    </button>
                    <button onClick={clearDailyData} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors">
                      <Settings size={20} />
                      <span className="text-xs font-bold uppercase">Limpar Tudo</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-soft-blue-100 bg-white/50">
              <button onClick={() => { setRole(null); setShowPasswordPrompt(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-soft-blue-100 text-soft-blue-400 transition-all font-bold">
                <LogOut size={20} />
                <span className="text-xs">Sair do Perfil</span>
              </button>
            </div>
          </nav>

          <main className="flex-1 p-4 md:p-10 overflow-y-auto bg-white">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-soft-blue-900 leading-tight uppercase tracking-tighter italic">
                  {activeTab === 'dashboard' && "Gestão de Linhas"}
                  {activeTab === 'entry' && "Registro de Atividade"}
                  {activeTab === 'downtime' && "Controle de Parada"}
                </h2>
                <p className="text-soft-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3 bg-soft-blue-50 p-2 px-4 rounded-full border border-soft-blue-100">
                 <div className="w-2 h-2 rounded-full bg-soft-blue-500 animate-pulse"></div>
                 <span className="text-[9px] font-black text-soft-blue-500 uppercase tracking-widest">Sincronizado VQ-CLOUD</span>
              </div>
            </header>

            {activeTab === 'dashboard' && <Dashboard defects={defects} okCars={okCars} downtime={downtime} />}
            {role === 'OPERATOR' && activeTab === 'entry' && (
              <EntryForm 
                onAddDefect={handleAddDefect} 
                onUpdateDefect={handleUpdateDefect}
                onAddOK={handleAddOK} 
                onUpdateOK={handleUpdateOK}
                recentDefects={defects} 
                recentOKCars={okCars} 
                onRemoveDefect={handleRemoveDefect} 
                onRemoveOK={handleRemoveOK} 
              />
            )}
            {role === 'OPERATOR' && activeTab === 'downtime' && <DowntimeForm onAddDowntime={handleAddDowntime} recentDowntime={downtime} onRemoveDowntime={handleRemoveDowntime} />}
          </main>
        </>
      )}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default App;
