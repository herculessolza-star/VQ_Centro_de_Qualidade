import React, { useMemo, useState } from 'react';
import { Area, DefectRecord, DowntimeRecord, OKCarRecord, CarModel } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList,
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Activity,
  Package,
  Calendar,
  Sparkles,
  Loader2,
  Info,
  History,
  RotateCcw,
  FileDown,
  Layers,
  MapPin,
  BarChart3,
  Search,
  Filter,
  X,
  FileText,
  Car,
  Presentation,
  Share2,
  Table,
  Globe,
  LocateFixed,
  ClipboardList,
  PieChart as PieIcon,
  ShieldCheck,
  UserCheck,
  BarChart as BarChartIcon
} from 'lucide-react';
import { generateAIInsights } from '../services/aiService';
import { exportDashboardToPDF } from '../services/pdfService';
import { exportToExcel } from '../services/excelService';
import { generateWhatsAppReport } from '../services/reportService';
import { generatePPTReport } from '../services/pptxService';

interface DashboardProps {
  defects: DefectRecord[];
  okCars: OKCarRecord[];
  downtime: DowntimeRecord[];
}

const AREAS: Area[] = ['Linha OK', 'Linha de Teste', 'Teste de Estrada', 'Teste de Chuva', 'Inspeção OffLine'];
const MODELS: CarModel[] = ['EQE', 'SA2', 'HA2'];
const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#fff1f2'];
const ATUACAO_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4'  // Cyan
];

const MODEL_COLORS = { 'EQE': '#6366f1', 'SA2': '#10b981', 'HA2': '#f59e0b' };

const ATUACAO_OFFLINE = [
  "Resinspeção Linha Ok",
  "reinspeção Linha de Teste/Chassis",
  "reinspeção teste de estrada",
  "reinspeção teste de chuva",
  "reinspeção recebimento",
  "reinspeção CL4/Global"
];

const ATUACAO_TESTE_ESTRADA = [
  "Teste de Estrada",
  "Chassis"
];

const Dashboard: React.FC<DashboardProps> = ({ defects, okCars, downtime }) => {
  const [selectedArea, setSelectedArea] = useState<Area | 'Geral'>('Geral');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [vinSearch, setVinSearch] = useState('');
  
  const [chartScope, setChartScope] = useState<'SELECTED' | 'GENERAL'>('SELECTED');

  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const stats = useMemo(() => {
    const baseFilter = (record: { timestamp: number, vin?: string }) => {
      const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
      const isInDateRange = recordDate >= startDate && recordDate <= endDate;
      const matchesVin = vinSearch === '' || (record.vin && record.vin.toUpperCase().includes(vinSearch.toUpperCase()));
      return isInDateRange && matchesVin;
    };

    const areaFilter = (record: { area: Area }) => {
      return selectedArea === 'Geral' || record.area === selectedArea;
    };

    const filteredDefects = defects.filter(r => baseFilter(r) && areaFilter(r));
    const filteredOkCars = okCars.filter(r => baseFilter(r) && areaFilter(r));
    const filteredDowntime = downtime.filter(r => baseFilter(r) && (selectedArea === 'Geral' || r.area === selectedArea));

    const chartDefects = (chartScope === 'GENERAL' || selectedArea === 'Geral') 
      ? defects.filter(baseFilter) 
      : filteredDefects;
    
    const chartOkCars = (chartScope === 'GENERAL' || selectedArea === 'Geral')
      ? okCars.filter(baseFilter)
      : filteredOkCars;

    const totalOk = filteredOkCars.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalDefects = filteredDefects.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalProcessed = totalOk + totalDefects;
    const totalDowntimeMinutes = filteredDowntime.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    
    const totalReinspections = [
      ...filteredOkCars.filter(o => o.isReinspection),
      ...filteredDefects.filter(d => d.isReinspection)
    ].reduce((acc, curr) => acc + curr.quantity, 0);

    const areaStats = AREAS.map(area => {
      const filterForAreaCards = (r: { timestamp: number, vin?: string, area: Area }) => {
        const d = new Date(r.timestamp).toISOString().split('T')[0];
        return d >= startDate && d <= endDate && (vinSearch === '' || (r.vin && r.vin.includes(vinSearch.toUpperCase()))) && r.area === area;
      };

      const areaDefects = defects.filter(filterForAreaCards).reduce((sum, d) => sum + d.quantity, 0);
      const areaOk = okCars.filter(filterForAreaCards).reduce((sum, o) => sum + o.quantity, 0);
      const areaDown = downtime.filter(dt => {
        const d = new Date(dt.timestamp).toISOString().split('T')[0];
        return d >= startDate && d <= endDate && dt.area === area;
      }).reduce((sum, dt) => sum + dt.durationMinutes, 0);
      
      const areaRe = [
        ...okCars.filter(o => filterForAreaCards(o) && o.isReinspection),
        ...defects.filter(d => filterForAreaCards(d) && d.isReinspection)
      ].reduce((sum, r) => sum + r.quantity, 0);

      const total = areaOk + areaDefects;
      return { 
        area, 
        ok: areaOk, 
        nok: areaDefects, 
        total,
        downtime: areaDown,
        re: areaRe,
        ftt: total > 0 ? ((areaOk / total) * 100).toFixed(1) : "0.0" 
      };
    });

    const sortIntervals = (a: string, b: string) => {
      const getStartTime = (str: string) => str.split(' as ')[0] || "00:00";
      return getStartTime(a).localeCompare(getStartTime(b));
    };

    const activeSlots = Array.from(new Set([
      ...chartOkCars.map(o => o.timeSlot),
      ...chartDefects.map(d => d.timeSlot)
    ])).filter(Boolean).sort(sortIntervals);

    const slotData = activeSlots.map(slot => {
      const ok = chartOkCars.filter(o => o.timeSlot === slot).reduce((s, o) => s + o.quantity, 0);
      const nok = chartDefects.filter(d => d.timeSlot === slot).reduce((s, d) => s + d.quantity, 0);
      return { slot, ok, nok, total: ok + nok };
    });

    const currentAtuacaoOptions = selectedArea === 'Teste de Estrada' ? ATUACAO_TESTE_ESTRADA : ATUACAO_OFFLINE;
    
    const detailTimeSeries = activeSlots.map(slot => {
      const entry: any = { slot };
      currentAtuacaoOptions.forEach(opt => {
        const ok = filteredOkCars.filter(o => o.area === selectedArea && o.atuacao === opt && o.timeSlot === slot).reduce((s, o) => s + o.quantity, 0);
        const nok = filteredDefects.filter(d => d.area === selectedArea && d.atuacao === opt && d.timeSlot === slot).reduce((s, d) => s + d.quantity, 0);
        entry[opt] = ok + nok;
      });
      return entry;
    });

    const detailTotalsByAtuacao = currentAtuacaoOptions.map((atuacao, idx) => {
      const ok = filteredOkCars.filter(o => o.area === selectedArea && o.atuacao === atuacao).reduce((s, o) => s + o.quantity, 0);
      const nok = filteredDefects.filter(d => d.area === selectedArea && d.atuacao === atuacao).reduce((s, d) => s + d.quantity, 0);
      return { 
        name: atuacao, 
        value: ok + nok,
        defects: nok,
        color: ATUACAO_COLORS[idx % ATUACAO_COLORS.length]
      };
    }).filter(e => e.value > 0 || e.defects > 0);

    const modelStats = MODELS.map(m => {
      const ok = chartOkCars.filter(o => o.model === m).reduce((s, o) => s + o.quantity, 0);
      const nok = chartDefects.filter(d => d.model === m).reduce((s, d) => s + d.quantity, 0);
      return { name: m, ok, nok, total: ok + nok };
    });

    const defectMap: Record<string, number> = {};
    chartDefects.forEach(d => {
      const areaTag = (selectedArea === 'Geral' || chartScope === 'GENERAL') ? ` [${d.area.split(' ')[0].toUpperCase()}]` : '';
      const atuacaoSuffix = d.atuacao ? ` (${d.atuacao.toUpperCase()})` : '';
      const type = `${d.defectType.trim().toUpperCase()}${areaTag}${atuacaoSuffix}`;
      defectMap[type] = (defectMap[type] || 0) + d.quantity;
    });
    const topDefects = Object.entries(defectMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    const vinHistory = [
      ...filteredOkCars.map(o => ({ ...o, type: 'OK' as const })),
      ...filteredDefects.map(d => ({ ...d, type: 'NOK' as const }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    const totalDowntimeHours = (totalDowntimeMinutes / 60).toFixed(1);

    return { 
      totalOk, totalDefects, totalProcessed, totalDowntimeHours, totalReinspections,
      areaStats, topDefects, slotData, modelStats, filteredDefects, filteredOkCars, filteredDowntime,
      detailTimeSeries, detailTotalsByAtuacao, vinHistory
    };
  }, [defects, okCars, downtime, startDate, endDate, selectedArea, vinSearch, chartScope]);

  const handleGetAIInsights = async () => {
    setLoadingAi(true);
    const result = await generateAIInsights(stats.filteredDefects, stats.filteredOkCars, stats.filteredDowntime);
    setAiInsights(result);
    setLoadingAi(false);
  };

  const resetFilters = () => {
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setVinSearch('');
    setSelectedArea('Geral');
    setChartScope('SELECTED');
  };

  return (
    <div id="dashboard-container" className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-[32px] shadow-xl shadow-slate-100 border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
              <Filter size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Filtros de Gestão</h3>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Ativo: {selectedArea}</p>
            </div>
          </div>
          <button onClick={resetFilters} className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase flex items-center gap-1 self-start md:self-center">
            <RotateCcw size={12} /> Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Período Inicial</label>
            <div className="relative">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
              <Calendar className="absolute right-3 top-3.5 text-indigo-400 pointer-events-none" size={16} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Período Final</label>
            <div className="relative">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
              <Calendar className="absolute right-3 top-3.5 text-indigo-400 pointer-events-none" size={16} />
            </div>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Busca por VIN (Dossiê)</label>
            <div className="relative">
              <input type="text" placeholder="Ex: 9BW..." value={vinSearch} onChange={(e) => setVinSearch(e.target.value.toUpperCase())} className="w-full p-3 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl font-mono font-bold text-indigo-900 outline-none focus:border-indigo-500 focus:bg-white transition-all pl-10"/>
              <Search className="absolute left-3 top-3.5 text-indigo-400" size={18} />
              {vinSearch && <button onClick={() => setVinSearch('')} className="absolute right-3 top-3 text-slate-300 hover:text-rose-500"><X size={20} /></button>}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Exportar Relatórios Consolidados ({selectedArea})</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => generateWhatsAppReport(stats.filteredDefects, stats.filteredOkCars, stats.filteredDowntime, selectedArea)} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-[9px] uppercase hover:bg-green-100 transition-all border border-green-100"><Share2 size={12} /> WhatsApp</button>
              <button onClick={() => exportToExcel(stats.filteredDefects, stats.filteredOkCars, stats.filteredDowntime, "Relatorio", selectedArea)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase hover:bg-emerald-100 transition-all border border-emerald-100"><Table size={12} /> Excel</button>
              <button onClick={() => generatePPTReport(stats.filteredDefects, stats.filteredOkCars, stats.filteredDowntime, 'WEEKLY', selectedArea)} className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-black text-[9px] uppercase hover:bg-orange-100 transition-all border border-orange-100"><Presentation size={12} /> Apresentação</button>
              <button onClick={() => exportDashboardToPDF('dashboard-container')} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-[9px] uppercase hover:bg-rose-100 transition-all border border-rose-100"><FileDown size={12} /> PDF Geral</button>
            </div>
          </div>
          <button onClick={handleGetAIInsights} className="flex items-center gap-3 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 w-full md:w-auto justify-center">
            {loadingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Direcionamento IA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'SOMA DO DIA', val: stats.totalProcessed, icon: Package, color: 'text-indigo-600', desc: 'Volume total filtrado.' },
          { label: 'TOTAL OK', val: stats.totalOk, icon: CheckCircle2, color: 'text-emerald-500', desc: 'Total de aprovações.' },
          { label: 'TOTAL NOK', val: stats.totalDefects, icon: AlertCircle, color: 'text-orange-500', desc: 'Total de defeitos.' },
          { label: 'REINSPEÇÃO', val: stats.totalReinspections, icon: RotateCcw, color: 'text-amber-500', desc: 'Retornos de inspeção.' },
          { label: 'HRS PARADA', val: `${stats.totalDowntimeHours}h`, icon: Clock, color: 'text-rose-500', desc: 'Tempo de inatividade.' },
          { 
            label: 'FTT GERAL', 
            val: `${stats.totalProcessed > 0 ? ((stats.totalOk / stats.totalProcessed) * 100).toFixed(1) : 0}%`, 
            icon: Activity, 
            color: 'text-blue-500',
            desc: 'Percentual de aprovação direta.'
          }
        ].map((card, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative group cursor-help">
            <div className="flex justify-between items-start mb-1">
               <card.icon size={14} className={`${card.color}`} />
               <Info size={10} className="text-slate-300" />
            </div>
            <div className="text-lg font-black text-slate-800">{card.val}</div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{card.label}</div>
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 shadow-xl leading-snug">
              {card.desc}
            </div>
          </div>
        ))}
      </div>

      {aiInsights && (
        <div className="bg-slate-900 text-indigo-100 p-6 rounded-[32px] animate-in slide-in-from-top duration-300 border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Sparkles size={80} />
           </div>
           <div className="flex justify-between items-start mb-4">
              <h5 className="text-indigo-400 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 italic">
                <Sparkles size={16} className="text-indigo-500"/> Foco Operacional (IA)
              </h5>
              <button onClick={() => setAiInsights(null)} className="text-indigo-400/50 hover:text-rose-400 transition-colors p-1"><X size={16}/></button>
           </div>
           <div className="text-sm font-bold leading-relaxed space-y-1">
             {aiInsights.split('\n').filter(l => l.trim()).map((line, i) => (
               <div key={i} className="flex items-start gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></div>
                 <p className="tracking-tight">{line.replace(/^(\*|-|\d+\.)\s*/, '')}</p>
               </div>
             ))}
           </div>
        </div>
      )}

      {vinSearch && (
        <div id="vehicle-dossier-container" className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-indigo-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 pb-6 border-b border-white/10">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-indigo-500 rounded-3xl shadow-lg shadow-indigo-500/20"><Car size={40} /></div>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-tight">Dossiê de Qualidade</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-indigo-400 font-bold uppercase text-[11px] tracking-widest">VIN:</span>
                  <span className="text-white text-lg font-mono font-black border-b border-indigo-500/50">{vinSearch}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10">
              <div className="text-right border-r border-white/10 pr-6 mr-2">
                <div className="text-3xl font-black text-indigo-400">{stats.vinHistory.length}</div>
                <div className="text-[9px] font-black uppercase tracking-widest opacity-50 text-white">Eventos de Inspeção</div>
              </div>
              <button 
                onClick={() => exportDashboardToPDF('vehicle-dossier-container', `Dossie_Oficial_VQ_${vinSearch}_${new Date().toISOString().split('T')[0]}.pdf`)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/40 active:scale-95"
              >
                <FileDown size={20} /> Exportar Dossiê PDF
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {stats.vinHistory.length > 0 ? stats.vinHistory.map((item, i) => (
              <div key={i} className="flex flex-col lg:grid lg:grid-cols-12 gap-6 p-6 bg-white/5 hover:bg-white/10 rounded-[32px] border border-white/10 transition-all relative group">
                <div className="hidden lg:block absolute left-[-20px] top-1/2 -translate-y-1/2 w-10 h-1 bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>
                
                <div className="lg:col-span-2 flex flex-col items-center justify-center border-r border-white/10 pr-6">
                  <div className="text-[10px] font-black opacity-40 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString('pt-BR')}</div>
                  <div className="text-2xl font-black text-white">{new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="mt-3 w-full bg-indigo-600/30 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase text-indigo-200 border border-indigo-500/40 flex items-center justify-center gap-2">
                    <Clock size={12} className="text-indigo-400" /> {item.timeSlot || 'SELEÇÃO MANUAL'}
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.type === 'OK' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                      {item.type === 'OK' ? 'CONFORME' : 'NÃO CONFORME'}
                    </span>
                    {item.isReinspection && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-[9px] font-black text-amber-400 uppercase">
                        <RotateCcw size={12} className="animate-spin-slow" /> Reinspeção
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/10 rounded-xl"><MapPin size={14} className="text-indigo-400" /></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase opacity-40">Local de Registro</span>
                      <span className="text-xs font-black uppercase tracking-tight leading-none">{item.area}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-3">
                  {item.atuacao && (
                    <div className="flex items-center gap-3 text-white">
                      <div className="p-2 bg-white/10 rounded-xl"><LocateFixed size={14} className="text-emerald-400" /></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase opacity-40">Seção de Atuação</span>
                        <span className="text-xs font-black uppercase text-indigo-300">{item.atuacao}</span>
                      </div>
                    </div>
                  )}
                  {item.type === 'NOK' && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl relative">
                      <div className="text-[9px] font-black text-rose-400 uppercase mb-1 flex items-center gap-2">
                        <AlertCircle size={10} /> Descrição da Ocorrência
                      </div>
                      <div className="text-xs font-medium text-rose-100 italic">"{(item as any).defectType}"</div>
                    </div>
                  )}
                  {item.liberado && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl relative">
                      <div className="text-[9px] font-black text-emerald-400 uppercase mb-1 flex items-center gap-2">
                        <ShieldCheck size={10} /> Liberação / Observação
                      </div>
                      <div className="text-xs font-medium text-emerald-100 italic">"{item.liberado}"</div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-3 flex flex-col items-end justify-center border-l border-white/10 pl-6">
                  <div className="text-right">
                    <div className="text-[10px] font-bold opacity-40 uppercase mb-1 flex items-center justify-end gap-1">
                      <UserCheck size={10} /> Inspetor Responsável
                    </div>
                    <div className="text-sm font-black text-white bg-indigo-50/20 px-5 py-2 rounded-2xl border border-indigo-500/30 shadow-inner">
                      {item.employeeId}
                    </div>
                    <div className="mt-2 text-[8px] font-black text-indigo-400 uppercase tracking-widest opacity-60">Autenticado VQ-Cloud</div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-24 text-center space-y-6">
                <div className="relative inline-block">
                   <FileText size={80} className="mx-auto opacity-5 text-indigo-400" />
                   <Search size={32} className="absolute bottom-0 right-0 text-indigo-500/40" />
                </div>
                <p className="text-indigo-300 font-black italic tracking-tighter text-xl">Nenhum registro histórico localizado para este VIN.</p>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Verifique se o número foi digitado corretamente ou altere o período do filtro.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.areaStats.map((area, idx) => (
          <div key={idx} onClick={() => { setSelectedArea(area.area); setChartScope('SELECTED'); }} className={`p-5 rounded-[24px] border-2 transition-all cursor-pointer group relative ${selectedArea === area.area ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}>
            {area.re > 0 && <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-full border-2 border-white shadow-sm flex items-center gap-1"><RotateCcw size={8} /> R: {area.re}</div>}
            <div className="flex justify-between items-start mb-4">
              <h4 className={`text-[11px] font-black uppercase tracking-tighter pr-8 leading-tight ${selectedArea === area.area ? 'text-indigo-600' : 'text-slate-400'}`}>{area.area}</h4>
              <div className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white text-indigo-500 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">{area.ftt}%</div>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center border-t border-slate-100 pt-4">
              <div><div className="text-sm font-black text-slate-800">{area.total}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Total</div></div>
              <div className="border-l border-slate-100"><div className="text-sm font-black text-emerald-600">{area.ok}</div><div className="text-[8px] font-bold text-slate-400 uppercase">OK</div></div>
              <div className="border-x border-slate-100"><div className="text-sm font-black text-orange-500">{area.nok}</div><div className="text-[8px] font-bold text-slate-400 uppercase">NOK</div></div>
              <div><div className="text-sm font-black text-rose-500">{area.downtime}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Min</div></div>
            </div>
          </div>
        ))}
      </div>

      {(selectedArea === 'Inspeção OffLine' || selectedArea === 'Teste de Estrada') && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 p-4 bg-indigo-600 rounded-3xl text-white shadow-lg">
            <ClipboardList size={24} />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter italic">Análise Detalhada: {selectedArea}</h3>
              <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Distribuição por Atuação e Horário</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <History size={16} className="text-indigo-500" /> Produção por Seção e Horário
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Volume total por intervalo inserido</p>
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.detailTimeSeries} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="slot" axisLine={false} tickLine={false} fontSize={10} fontWeight="black" angle={-45} textAnchor="end" interval={0} />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} 
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'black', paddingBottom: '20px', textTransform: 'uppercase' }} />
                    {(selectedArea === 'Teste de Estrada' ? ATUACAO_TESTE_ESTRADA : ATUACAO_OFFLINE).map((opt, idx) => (
                      <Bar key={opt} dataKey={opt} stackId="a" fill={ATUACAO_COLORS[idx % ATUACAO_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <div className="mb-6">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <PieIcon size={16} className="text-indigo-500" /> Volume por Seção
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Distribuição (OK + NOK)</p>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.detailTotalsByAtuacao}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.detailTotalsByAtuacao.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {stats.detailTotalsByAtuacao.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter truncate max-w-[100px]">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-indigo-600">{item.value} <small className="text-[7px] text-slate-400 italic">UN</small></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <div className="mb-6">
                  <h4 className="text-sm font-black text-rose-600 uppercase tracking-tight flex items-center gap-2 italic">
                    <AlertCircle size={16} className="text-rose-500" /> Defeitos por Seção
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Total de Ocorrências (NOK)</p>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.detailTotalsByAtuacao} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={8} fontWeight="black" angle={-15} textAnchor="end" />
                      <YAxis axisLine={false} tickLine={false} fontSize={8} />
                      <Tooltip cursor={{ fill: '#fff1f2' }} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '9px', fontWeight: 'bold' }} />
                      <Bar dataKey="defects" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40}>
                        <LabelList dataKey="defects" position="top" style={{ fontSize: '10px', fontWeight: 'black', fill: '#9f1239' }} />
                        {stats.detailTotalsByAtuacao.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl">
                   <div className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-2 mb-1">
                      <BarChartIcon size={10} /> Resumo de Falhas
                   </div>
                   <div className="text-[14px] font-black text-rose-900 leading-none">
                      {stats.detailTotalsByAtuacao.reduce((acc, curr) => acc + curr.defects, 0)} <span className="text-[9px] font-bold opacity-50">DEFEITOS TOTAIS</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedArea !== 'Geral' && (
        <div className="bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100 flex items-center justify-between animate-in fade-in duration-500">
           <div className="flex items-center gap-3 px-3"><BarChart3 size={16} className="text-indigo-500" /><span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Escopo dos Gráficos:</span></div>
           <div className="flex gap-1">
              <button onClick={() => setChartScope('SELECTED')} className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${chartScope === 'SELECTED' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-400 hover:bg-indigo-100'}`}><LocateFixed size={12} /> {selectedArea}</button>
              <button onClick={() => setChartScope('GENERAL')} className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${chartScope === 'GENERAL' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-400 hover:bg-indigo-100'}`}><Globe size={12} /> Geral (Todas as Áreas)</button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
             <div>
               <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight"><History size={20} className="text-indigo-600" /> Produção por Hora</h3>
               <p className="text-xs text-slate-500">Frequência por intervalo de horas registrado.</p>
             </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.slotData} margin={{ top: 20, right: 10, left: -20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="slot" axisLine={false} tickLine={false} fontSize={10} fontWeight="black" angle={-45} textAnchor="end" interval={0} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px', fontWeight: 'bold' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
                <Bar name="Carros OK" dataKey="ok" stackId="a" fill="#10b981" barSize={30} />
                <Bar name="Defeitos" dataKey="nok" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30}>
                   <LabelList dataKey="total" position="top" style={{ fontSize: '11px', fontWeight: 'black', fill: '#1e293b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
             <div>
               <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight"><Layers size={20} className="text-indigo-600" /> Produção por Modelo</h3>
               <p className="text-xs text-slate-500">Distribuição total de veículos registrados.</p>
             </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.modelStats} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} fontWeight="black" />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                <Bar name="Total Produzido" dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={50}>
                   <LabelList dataKey="total" position="top" style={{ fontSize: '12px', fontWeight: 'black', fill: '#6366f1' }} />
                   {stats.modelStats.map((entry, index) => (<Cell key={index} fill={MODEL_COLORS[entry.name as keyof typeof MODEL_COLORS] || '#6366f1'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
           <div><h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight"><TrendingUp size={20} className="text-orange-600" /> TOP 10 QUESTÕES</h3><p className="text-xs text-slate-500">Ranking das irregularidades mais reportadas.</p></div>
        </div>
        <div className="h-[300px]">
          {stats.topDefects.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topDefects} layout="vertical" margin={{ left: 40, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide /><YAxis dataKey="name" type="category" width={180} fontSize={8} fontWeight="bold" axisLine={false} tickLine={false} /><Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={15}>
                  {stats.topDefects.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">Nenhum defeito registrado com os filtros atuais.</div>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;