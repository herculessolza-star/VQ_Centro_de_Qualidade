
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Clock, 
  Settings, 
  LogOut,
  Car,
  ShieldAlert,
  FileText,
  Presentation,
  Lock,
  X,
  ArrowRight,
  Download,
  Database,
  RefreshCw,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  Users,
  AlertCircle
} from 'lucide-react';
import { Area, CarModel, DefectRecord, DowntimeRecord, OKCarRecord, ViewRole } from './types';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import DowntimeForm from './components/DowntimeForm';
import { exportToExcel } from './services/excelService';
import { generateWhatsAppReport } from './services/reportService';
import { generatePPTReport } from './services/pptxService';
import { cloudService, FirebaseConfig } from './services/cloudService';

const App: React.FC = () => {
  const [role, setRole] = useState<ViewRole | null>(null);
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [okCars, setOkCars] = useState<OKCarRecord[]>([]);
  const [downtime, setDowntime] = useState<DowntimeRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'downtime'>('dashboard');

  // Cloud State
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem('vq_workspace_id') || 'PLANTA-01-VQ');
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showCloudConfig, setShowCloudConfig] = useState(false);

  // Auth State
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Firebase Config Form
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>({
    apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
  });

  // Inicializa Nuvem e Listeners
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    if (cloudService.isConfigured()) {
      const initialized = cloudService.init();
      if (initialized) {
        setIsCloudReady(true);
        setIsSyncing(true);

        // Listeners em tempo real - Isso é o que permite várias pessoas verem os mesmos dados
        const unsubDefects = cloudService.subscribe(workspaceId, 'defects', (data) => {
          setDefects(data);
          setIsSyncing(false);
        });
        const unsubOK = cloudService.subscribe(workspaceId, 'okCars', (data) => setOkCars(data));
        const unsubDown = cloudService.subscribe(workspaceId, 'downtime', (data) => setDowntime(data));

        return () => {
          unsubDefects();
          unsubOK();
          unsubDown();
        };
      }
    } else {
      // Se não houver cloud, tenta carregar local apenas para preview
      const localDefects = localStorage.getItem('qc_defects_backup');
      if (localDefects) setDefects(JSON.parse(localDefects));
    }

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, [workspaceId]);

  // Handlers de Cloud
  const handleAddDefect = async (record: any) => {
    if (!isCloudReady) return alert("Configure a nuvem para salvar.");
    await cloudService.save(workspaceId, 'defects', { ...record, timestamp: record.timestamp || Date.now() });
  };

  const handleUpdateDefect = async (id: string, record: any) => {
    await cloudService.save(workspaceId, 'defects', { ...record, id });
  };

  const handleRemoveDefect = async (id: string) => {
    if (confirm('Deseja realmente apagar este lançamento da nuvem?')) {
      await cloudService.delete(workspaceId, 'defects', id);
    }
  };

  const handleAddOK = async (record: any) => {
    if (!isCloudReady) return alert("Configure a nuvem para salvar.");
    await cloudService.save(workspaceId, 'okCars', { ...record, timestamp: record.timestamp || Date.now() });
  };

  const handleUpdateOK = async (id: string, record: any) => {
    await cloudService.save(workspaceId, 'okCars', { ...record, id });
  };

  const handleRemoveOK = async (id: string) => {
    if (confirm('Deseja realmente apagar este lançamento da nuvem?')) {
      await cloudService.delete(workspaceId, 'okCars', id);
    }
  };

  const handleAddDowntime = async (record: any) => {
    await cloudService.save(workspaceId, 'downtime', { ...record, timestamp: Date.now() });
  };

  const handleRemoveDowntime = async (id: string) => {
    await cloudService.delete(workspaceId, 'downtime', id);
  };

  const clearDailyData = async () => {
    if (confirm('Isso apagará TODOS os dados da nuvem para este Workspace. Confirmar?')) {
      await cloudService.clearAll(workspaceId);
    }
  };

  const saveWorkspaceId = (id: string) => {
    const cleanId = id.toUpperCase().replace(/\s/g, '-');
    setWorkspaceId(cleanId);
    localStorage.setItem('vq_workspace_id', cleanId);
    window.location.reload(); // Recarrega para reinicializar listeners no novo path
  };

  const verifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '654321') {
      setRole('MANAGER');
      setActiveTab('dashboard');
      setShowPasswordPrompt(false);
      setPasswordInput('');
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-slate-900">
      {role === null ? (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-soft-blue-600 to-soft-blue-900">
          <div className="bg-white p-10 rounded-[48px] shadow-2xl w-full max-w-lg text-center animate-in fade-in zoom-in duration-500">
            <div className="flex justify-center mb-8">
              <div className="p-6 bg-soft-blue-500 rounded-[32px] shadow-xl shadow-soft-blue-400/20 text-white">
                <Car className="w-16 h-16" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter italic italic">VQ Management Cloud</h1>
            <p className="text-slate-400 mb-10 text-[10px] font-black uppercase tracking-[0.4em]">Plataforma de Gestão em Tempo Real</p>
            
            <div className="mb-8 p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 flex items-center justify-center gap-2">
                <Users size={12} /> Workspace ID (Grupo de Trabalho)
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={workspaceId} 
                  onChange={(e) => setWorkspaceId(e.target.value.toUpperCase())}
                  onBlur={(e) => saveWorkspaceId(e.target.value)}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-center font-black text-xl text-soft-blue-600 focus:border-soft-blue-500 outline-none transition-all"
                  placeholder="EX: PLANTA-VQ-01"
                />
                <Database className="absolute right-4 top-5 text-slate-300" size={20} />
              </div>
              <p className="text-[9px] text-slate-400 mt-3 font-bold uppercase leading-relaxed px-4">
                Usuários com o mesmo ID compartilham os mesmos dados na nuvem simultaneamente.
              </p>
            </div>

            {!showPasswordPrompt ? (
              <div className="space-y-4">
                <button onClick={() => { setRole('OPERATOR'); setActiveTab('entry'); }} className="w-full flex items-center justify-between p-6 bg-white border-2 border-slate-50 hover:border-soft-blue-500 rounded-[32px] transition-all group shadow-sm hover:shadow-xl active:scale-95">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-soft-blue-50 rounded-2xl text-soft-blue-600"><ClipboardCheck className="w-8 h-8" /></div>
                    <span className="font-black text-lg text-slate-700 uppercase italic">Lançar Defeito/OK</span>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-200 group-hover:text-soft-blue-500 transition-colors" />
                </button>
                <button onClick={() => setShowPasswordPrompt(true)} className="w-full flex items-center justify-between p-6 bg-white border-2 border-slate-50 hover:border-soft-blue-500 rounded-[32px] transition-all group shadow-sm hover:shadow-xl active:scale-95">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><LayoutDashboard className="w-8 h-8" /></div>
                    <span className="font-black text-lg text-slate-700 uppercase italic">Painel de Gestão</span>
                  </div>
                  <Lock className="w-6 h-6 text-slate-200 group-hover:text-soft-blue-500 transition-colors" />
                </button>
                
                <button onClick={() => setShowCloudConfig(true)} className="mt-4 text-[10px] font-black text-slate-400 hover:text-soft-blue-600 uppercase tracking-widest flex items-center justify-center gap-2 w-full pt-4 border-t border-slate-50">
                  <Settings size={12} /> Configuração de Nuvem (TI)
                </button>
              </div>
            ) : (
              <div className="animate-in slide-in-from-bottom-8 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-slate-900 uppercase italic">Acesso Restrito</h2>
                  <button onClick={() => setShowPasswordPrompt(false)} className="p-2 text-slate-300 hover:text-rose-500"><X size={24} /></button>
                </div>
                <form onSubmit={verifyPassword} className="space-y-6">
                  <div className="relative">
                    <input type="password" autoFocus value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`w-full p-6 bg-slate-50 border-4 rounded-[32px] font-black text-center text-3xl tracking-[0.5em] outline-none transition-all ${passwordError ? 'border-rose-500 animate-shake bg-rose-50' : 'border-transparent focus:border-soft-blue-500 focus:bg-white'}`} placeholder="••••••" />
                    {passwordError && <p className="text-[10px] font-black text-rose-500 uppercase mt-2">Senha de Gestor Incorreta</p>}
                  </div>
                  <button type="submit" className="w-full py-6 bg-soft-blue-600 text-white font-black rounded-[32px] shadow-2xl shadow-soft-blue-500/30 flex items-center justify-center gap-3 hover:bg-soft-blue-700 active:scale-95 transition-all">
                    <span>ACESSAR DASHBOARD</span>
                    <ArrowRight size={24} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <nav className="w-full md:w-80 bg-slate-900 text-white md:min-h-screen flex flex-col border-r border-slate-800">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-black/10">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-soft-blue-600 rounded-xl shadow-lg shadow-soft-blue-600/20"><ShieldAlert className="w-8 h-8 text-white" /></div>
                <span className="font-black text-2xl tracking-tighter uppercase italic">VQ-CLOUD</span>
              </div>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isOnline ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}>
                {isOnline ? <Wifi size={8} className="text-white" /> : <WifiOff size={8} className="text-white" />}
              </div>
            </div>
            
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              <div className="p-5 bg-white/5 border border-white/10 rounded-[32px]">
                 <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Status da Nuvem:</div>
                 <div className="flex items-center gap-3">
                   {isCloudReady ? <Cloud className="text-soft-blue-400" size={18} /> : <CloudOff className="text-rose-400" size={18} />}
                   <div className="text-xs font-black truncate text-white">{workspaceId}</div>
                 </div>
                 {isSyncing && <div className="mt-2 flex items-center gap-2 text-[8px] font-black text-soft-blue-400 uppercase animate-pulse"><RefreshCw size={10} className="animate-spin" /> Sincronizando dados...</div>}
              </div>

              <div className="space-y-2">
                <div className="px-4 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Navegação</div>
                {role === 'MANAGER' && (
                  <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-soft-blue-600 text-white shadow-xl shadow-soft-blue-900/40' : 'hover:bg-slate-800 text-slate-400 font-black italic uppercase'}`}>
                    <LayoutDashboard size={22} />
                    <span>Painel Global</span>
                  </button>
                )}
                {role === 'OPERATOR' && (
                  <>
                    <button onClick={() => setActiveTab('entry')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'entry' ? 'bg-soft-blue-600 text-white shadow-xl shadow-soft-blue-900/40' : 'hover:bg-slate-800 text-slate-400 font-black italic uppercase'}`}>
                      <ClipboardCheck size={22} />
                      <span>Lançar Atividade</span>
                    </button>
                    <button onClick={() => setActiveTab('downtime')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'downtime' ? 'bg-soft-blue-600 text-white shadow-xl shadow-soft-blue-900/40' : 'hover:bg-slate-800 text-slate-400 font-black italic uppercase'}`}>
                      <Clock size={22} />
                      <span>Parada de Linha</span>
                    </button>
                  </>
                )}
              </div>

              {role === 'MANAGER' && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Relatórios e Cloud</div>
                  <button onClick={() => generatePPTReport(defects, okCars, downtime, 'WEEKLY')} className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800 text-slate-400 text-xs font-black uppercase transition-all">
                    <Presentation size={18} className="text-indigo-400" /> PPT Semanal
                  </button>
                  <button onClick={() => exportToExcel(defects, okCars, downtime)} className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800 text-slate-400 text-xs font-black uppercase transition-all">
                    <FileText size={18} className="text-emerald-400" /> Excel Full
                  </button>
                  <button onClick={clearDailyData} className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-rose-500/10 text-rose-400 text-xs font-black uppercase transition-all">
                    <Settings size={18} /> Limpar Cloud
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 bg-black/20 border-t border-slate-800">
              <button onClick={() => { setRole(null); setShowPasswordPrompt(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-rose-500/10 text-rose-400 transition-all font-black uppercase text-xs italic">
                <LogOut size={20} />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </nav>

          <main className="flex-1 p-6 md:p-12 overflow-y-auto bg-slate-50">
            <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-[32px] ${role === 'MANAGER' ? 'bg-indigo-600' : 'bg-soft-blue-600'} text-white shadow-xl shadow-slate-200`}>
                   {activeTab === 'dashboard' ? <LayoutDashboard size={40} /> : <ClipboardCheck size={40} />}
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                    {activeTab === 'dashboard' ? "Visão Global" : activeTab === 'entry' ? "Inspeção de Veículos" : "Controle de Linha"}
                  </h2>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-2 text-soft-blue-600 font-black text-[11px] uppercase tracking-widest bg-soft-blue-50 px-4 py-2 rounded-2xl shadow-sm">
                      <Database size={12} /> ID: {workspaceId}
                    </span>
                    <span className="text-slate-400 font-bold text-[11px] uppercase tracking-widest border-l border-slate-200 pl-4">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 {!isCloudReady && (
                   <div className="flex items-center gap-2 px-5 py-3 bg-rose-50 border-2 border-rose-100 rounded-[24px] text-rose-600 text-[10px] font-black uppercase animate-pulse">
                     <AlertCircle size={14} /> Modo Local (Sem Cloud)
                   </div>
                 )}
                 <div className={`flex items-center gap-3 px-6 py-4 rounded-[24px] border-2 transition-all shadow-sm ${isOnline ? 'bg-white border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                    {isOnline ? <Cloud size={20} className="animate-bounce" /> : <CloudOff size={20} />}
                    <span className="text-xs font-black uppercase tracking-widest">{isOnline ? 'Nuvem Conectada' : 'Offline'}</span>
                 </div>
              </div>
            </header>

            {isSyncing ? (
              <div className="flex flex-col items-center justify-center h-[50vh] space-y-6">
                 <div className="relative">
                    <RefreshCw size={80} className="text-soft-blue-200 animate-spin" />
                    <Cloud size={32} className="absolute inset-0 m-auto text-soft-blue-600" />
                 </div>
                 <div className="text-center">
                    <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-xl italic">Sincronizando Nuvem...</p>
                    <p className="text-slate-400 font-bold text-xs mt-2 uppercase">Aguarde enquanto os dados globais são carregados</p>
                 </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                {role === 'OPERATOR' && activeTab === 'downtime' && (
                  <DowntimeForm 
                    onAddDowntime={handleAddDowntime} 
                    recentDowntime={downtime} 
                    onRemoveDowntime={handleRemoveDowntime} 
                  />
                )}
              </div>
            )}
          </main>
        </>
      )}

      {/* Cloud Setup Modal */}
      {showCloudConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-10 flex items-center justify-between text-white border-b border-white/10">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-soft-blue-600 rounded-[24px] shadow-lg shadow-soft-blue-500/30"><Cloud size={32} /></div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">Configuração Firebase Cloud</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Integração oficial para múltiplos usuários</p>
                </div>
              </div>
              <button onClick={() => setShowCloudConfig(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={32}/></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); cloudService.saveConfig(firebaseConfig); }} className="p-10 space-y-8">
              <div className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-[32px] text-indigo-700 text-xs font-bold leading-relaxed flex gap-4 italic">
                <AlertCircle size={32} className="shrink-0 text-indigo-500" />
                <p>
                  <strong>Instruções:</strong> Para que várias pessoas usem o app ao mesmo tempo em qualquer lugar, você precisa de um projeto no Firebase (Gratuito). Copie as credenciais do seu console para os campos abaixo.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(firebaseConfig).map((key) => (
                  <div key={key} className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{key}</label>
                    <input 
                      type="text" 
                      required 
                      value={(firebaseConfig as any)[key]} 
                      onChange={(e) => setFirebaseConfig({...firebaseConfig, [key]: e.target.value})}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm focus:border-soft-blue-500 outline-none transition-all"
                      placeholder={`Insira o ${key}`}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setShowCloudConfig(false)} className="flex-1 py-5 font-black text-slate-400 uppercase tracking-widest text-xs hover:text-slate-600">Cancelar</button>
                <button type="submit" className="flex-[2] py-5 bg-soft-blue-600 text-white font-black rounded-3xl shadow-xl shadow-soft-blue-500/20 text-xs uppercase tracking-[0.2em] hover:bg-soft-blue-700 transition-all active:scale-95">
                  Conectar e Ativar Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
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
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
