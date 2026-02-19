import React, { useState, useMemo } from 'react';
import { Area, DowntimeRecord } from '../types';
import { Clock, AlertTriangle, Pause, Trash2, History } from 'lucide-react';

interface DowntimeFormProps {
  onAddDowntime: (record: Omit<DowntimeRecord, 'id' | 'timestamp'>) => void;
  recentDowntime: DowntimeRecord[];
  onRemoveDowntime: (id: string) => void;
}

const DOWNTIME_REASONS = [
  "",
  "Parada não programada",
  "Falta de peça",
  "Manutenção equipamento",
  "Problema elétrico",
  "Problema mecânico",
  "Falta de mão de obra",
  "Parada programada",
  "DDS",
  "Falta de energia",
  "Aguardando carro",
  "Problema de qualidade"
];

const DowntimeForm: React.FC<DowntimeFormProps> = ({ onAddDowntime, recentDowntime, onRemoveDowntime }) => {
  const [area, setArea] = useState<Area>('Linha OK');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [reason, setReason] = useState<string>(DOWNTIME_REASONS[0]);

  const AREAS: Area[] = ['Linha OK', 'Linha de Teste', 'Teste de Estrada', 'Teste de Chuva', 'Inspeção OffLine'];

  const calculatedDuration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 1440;
    return diff;
  }, [startTime, endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) return alert('Por favor, informe o início e o fim da parada.');
    if (calculatedDuration === 0) return alert('A duração não pode ser zero.');
    onAddDowntime({ area, startTime, endTime, durationMinutes: calculatedDuration, reason });
    setStartTime(''); setEndTime(''); setReason(DOWNTIME_REASONS[0]);
    alert(`Parada de ${calculatedDuration} min registrada com sucesso!`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 space-y-6">
        <div className="flex items-center gap-3 text-rose-600 pb-4 border-b border-slate-100">
          <Pause size={24} />
          <h3 className="text-xl font-black uppercase tracking-tight">Registro de Parada</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Área da Parada</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AREAS.map(a => (
                <button
                  key={a} type="button" onClick={() => setArea(a)}
                  className={`p-3 rounded-xl border-2 text-[10px] font-black transition-all ${area === a ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-slate-50 text-slate-400'}`}
                >
                  {a.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Início</label>
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Fim</label>
              <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Motivo</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
              {DOWNTIME_REASONS.map((r, idx) => (
                <option key={idx} value={r}>
                  {r === "" ? "Nenhum / Vazio" : r}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-lg rounded-2xl shadow-xl transition-all shadow-rose-100">
            FINALIZAR REGISTRO
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
           <History size={16} className="text-rose-500" />
           <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Últimas Paradas</span>
        </div>
        <div className="divide-y divide-slate-100">
          {recentDowntime.slice(0, 5).map((record) => (
            <div key={record.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <div className="text-xs font-black text-slate-800">{record.area} • <span className="text-rose-600">{record.durationMinutes}min</span></div>
                <div className="text-[10px] text-slate-400 font-bold">{record.reason || 'Sem motivo'} | {record.startTime}-{record.endTime}</div>
              </div>
              <button onClick={() => onRemoveDowntime(record.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DowntimeForm;