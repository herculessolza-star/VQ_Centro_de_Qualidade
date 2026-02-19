import React, { useState, useMemo, useEffect } from 'react';
import { Area, CarModel, DefectRecord, OKCarRecord } from '../types';
import { 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Minus,
  Search,
  Scan,
  UserCircle,
  RotateCcw,
  Trash2,
  History,
  FileDown,
  MapPin,
  Pencil,
  XCircle,
  Clock,
  Calendar,
  FileCheck,
  ChevronRight,
  Timer,
  ShieldCheck
} from 'lucide-react';
import Scanner from './Scanner';
import { exportOperatorLogToPDF } from '../services/pdfService';

interface EntryFormProps {
  onAddDefect: (record: Omit<DefectRecord, 'id' | 'timestamp'> & { timestamp?: number }) => void;
  onUpdateDefect: (id: string, record: Omit<DefectRecord, 'id' | 'timestamp'> & { timestamp?: number }) => void;
  onAddOK: (record: Omit<OKCarRecord, 'id' | 'timestamp'> & { timestamp?: number }) => void;
  onUpdateOK: (id: string, record: Omit<OKCarRecord, 'id' | 'timestamp'> & { timestamp?: number }) => void;
  recentDefects: DefectRecord[];
  recentOKCars: OKCarRecord[];
  onRemoveDefect: (id: string) => void;
  onRemoveOK: (id: string) => void;
}

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

const PRESET_TIME_SLOTS = [
  { start: "08:00", end: "09:00" },
  { start: "09:00", end: "09:50" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "11:30" },
  { start: "12:30", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "14:50" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
  { start: "17:00", end: "17:30" }
];

const EntryForm: React.FC<EntryFormProps> = ({ 
  onAddDefect, 
  onUpdateDefect,
  onAddOK, 
  onUpdateOK,
  recentDefects, 
  recentOKCars,
  onRemoveDefect,
  onRemoveOK 
}) => {
  const [status, setStatus] = useState<'OK' | 'NOT_OK'>('OK');
  const [model, setModel] = useState<CarModel>('EQE');
  const [area, setArea] = useState<Area>('Linha OK');
  const [atuacao, setAtuacao] = useState('');
  const [liberado, setLiberado] = useState('');
  const [isReinspection, setIsReinspection] = useState(false);
  const [vin, setVin] = useState('');
  
  const [employeeId, setEmployeeId] = useState(() => localStorage.getItem('qc_last_employee_id') || '');
  const [isMatriculaLocked, setIsMatriculaLocked] = useState(!!localStorage.getItem('qc_last_employee_id'));

  const [defectType, setDefectType] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [showScanner, setShowScanner] = useState(false);

  const [editingRecord, setEditingRecord] = useState<{ id: string, type: 'OK' | 'NOT_OK' } | null>(null);

  const isAtuacaoArea = area === 'Inspeção OffLine' || area === 'Teste de Estrada';
  
  // Agora VIN e Matrícula são obrigatórios APENAS para Inspeção OffLine
  const isMatriculaRequired = area === 'Inspeção OffLine'; 
  const isVinRequired = area === 'Inspeção OffLine';
  
  const currentAtuacaoOptions = area === 'Teste de Estrada' ? ATUACAO_TESTE_ESTRADA : ATUACAO_OFFLINE;

  useEffect(() => {
    if (!isAtuacaoArea) {
      setAtuacao('');
      setLiberado('');
    } else {
      if (!currentAtuacaoOptions.includes(atuacao)) {
        setAtuacao('');
      }
    }
  }, [area, isAtuacaoArea, currentAtuacaoOptions, atuacao]);

  const cancelEdit = () => {
    setEditingRecord(null);
    setVin('');
    setQuantity(1);
    setIsReinspection(false);
    setDefectType('');
    setAtuacao('');
    setLiberado('');
    setStatus('OK');
    setStartTime("");
    setEndTime("");
    setEntryDate(new Date().toISOString().split('T')[0]);
  };

  const handleEditClick = (record: any, type: 'OK' | 'NOT_OK') => {
    setEditingRecord({ id: record.id, type });
    setStatus(type);
    setModel(record.model);
    setArea(record.area);
    setAtuacao(record.atuacao || '');
    setLiberado(record.liberado || '');
    setIsReinspection(record.isReinspection || false);
    setVin(record.vin || '');
    setDefectType(record.defectType || '');
    setQuantity(record.quantity || 1);
    
    if (record.timeSlot && record.timeSlot.includes(" as ")) {
      const parts = record.timeSlot.split(" as ");
      setStartTime(parts[0]);
      setEndTime(parts[1]);
    } else {
      setStartTime("");
      setEndTime("");
    }
    
    setEntryDate(new Date(record.timestamp).toISOString().split('T')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSlot = (s: string, e: string) => {
    setStartTime(s);
    setEndTime(e);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isMatriculaRequired && !employeeId) {
      return alert('A matrícula do colaborador é obrigatória para este posto de trabalho.');
    }
    
    if (!startTime || !endTime) return alert('Por favor, selecione o horário de início e fim.');
    if (!entryDate) return alert('Por favor, selecione a data no calendário.');
    
    const combinedTimeSlot = `${startTime} as ${endTime}`;

    if (isAtuacaoArea) {
      if (!atuacao) return alert('Por favor, selecione o local de atuação.');
      if (area === 'Inspeção OffLine' && status === 'OK' && (!liberado || liberado.trim() === '')) {
        return alert('Por favor, escreva o que foi liberado nesta Inspeção OffLine.');
      }
    }

    if (isVinRequired) {
      if (!vin || vin.trim() === '') {
        return alert('O número do VIN é obrigatório para este posto de trabalho.');
      }
    }

    const [year, month, day] = entryDate.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    
    if (isNaN(parsedDate.getTime())) {
      return alert('Data inválida.');
    }

    const normalizedVin = vin.trim().toUpperCase();
    const isToday = parsedDate.toLocaleDateString() === new Date().toLocaleDateString();
    
    const timestamp = isToday ? Date.now() : new Date(year, month - 1, day, 12, 0, 0, 0).getTime();

    const isEditingThisVin = editingRecord && 
      ((editingRecord.type === 'OK' && recentOKCars.find(o => o.id === editingRecord.id)?.vin === normalizedVin) ||
       (editingRecord.type === 'NOT_OK' && recentDefects.find(d => d.id === editingRecord.id)?.vin === normalizedVin));

    if (!isEditingThisVin && normalizedVin !== '') {
      if (status === 'OK') {
        const alreadyExists = recentOKCars.some(r => r.vin?.toUpperCase() === normalizedVin && r.area === area && r.model === model && r.isReinspection === isReinspection && r.atuacao === atuacao && r.timeSlot === combinedTimeSlot);
        if (alreadyExists) return alert(`AVISO: O VIN ${normalizedVin} já possui um lançamento idêntico nesta área/atuação.`);
      } else {
        const alreadyExists = recentDefects.some(r => r.vin?.toUpperCase() === normalizedVin && r.area === area && r.defectType.toUpperCase() === defectType.toUpperCase() && r.atuacao === atuacao && r.timeSlot === combinedTimeSlot);
        if (alreadyExists) return alert(`ERRO: Este defeito já foi registrado para o VIN ${normalizedVin} nesta área/atuação.`);
      }
    }

    if (employeeId) {
      localStorage.setItem('qc_last_employee_id', employeeId);
      setIsMatriculaLocked(true);
    }

    const commonData = { model, area, employeeId, vin: normalizedVin, quantity, isReinspection, atuacao, liberado: liberado.trim(), timeSlot: combinedTimeSlot, timestamp };

    if (editingRecord) {
      if (status !== editingRecord.type) {
        if (editingRecord.type === 'OK') onRemoveOK(editingRecord.id);
        else onRemoveDefect(editingRecord.id);

        if (status === 'NOT_OK') onAddDefect({ ...commonData, defectType: defectType.trim() });
        else onAddOK(commonData);
      } else {
        if (status === 'NOT_OK') onUpdateDefect(editingRecord.id, { ...commonData, defectType: defectType.trim() });
        else onUpdateOK(editingRecord.id, commonData);
      }
      setEditingRecord(null);
    } else {
      if (status === 'NOT_OK') {
        if (!defectType || defectType.trim() === '') return alert('A descrição do defeito é obrigatória para carros NOT OK.');
        onAddDefect({ ...commonData, defectType: defectType.trim() });
      } else {
        onAddOK(commonData);
      }
    }

    setVin('');
    setQuantity(1);
    setIsReinspection(false);
    setDefectType('');
    setLiberado('');
    alert(editingRecord ? 'Lançamento atualizado com sucesso!' : 'Lançamento realizado com sucesso!');
  };

  const AREAS: Area[] = ['Linha OK', 'Linha de Teste', 'Teste de Estrada', 'Teste de Chuva', 'Inspeção OffLine'];
  const MODELS: CarModel[] = ['EQE', 'SA2', 'HA2'];

  const employeeRecentLogs = useMemo(() => {
    const combined = [
      ...recentDefects.map(d => ({ ...d, type: 'NOT_OK' as const })),
      ...recentOKCars.map(o => ({ ...o, type: 'OK' as const }))
    ];
    return combined
      .filter(r => employeeId ? r.employeeId === employeeId : true)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [recentDefects, recentOKCars, employeeId]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className={`bg-white rounded-[40px] shadow-2xl border-2 p-8 space-y-8 transition-all ${editingRecord ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-50'}`}>
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
           <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl text-white shadow-lg ${editingRecord ? 'bg-amber-500 shadow-amber-100' : 'bg-indigo-600 shadow-indigo-100'}`}>
               {editingRecord ? <Pencil size={24}/> : <Plus size={24}/>}
             </div>
             <div>
               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">
                 {editingRecord ? 'Modo Edição' : 'Novo Lançamento'}
               </h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingRecord ? 'Alterando registro existente' : 'Preencha os dados da inspeção'}</p>
             </div>
           </div>
           {editingRecord && (
             <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black hover:bg-rose-100 transition-all uppercase border border-rose-100">
               <XCircle size={14} /> Cancelar
             </button>
           )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="col-span-full">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                <UserCircle size={14} className="text-indigo-400" /> Identificação do Inspetor {isMatriculaRequired && '(Obrigatório)'}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required={isMatriculaRequired}
                  value={employeeId} 
                  onChange={(e) => setEmployeeId(e.target.value)}
                  readOnly={isMatriculaLocked}
                  className={`w-full p-4 border-2 rounded-2xl pl-12 font-black text-lg transition-all outline-none ${isMatriculaLocked ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border-indigo-100 text-indigo-900 focus:border-indigo-500 shadow-sm'}`}
                  placeholder={isMatriculaRequired ? "Matrícula Obrigatória" : "Matrícula"}
                />
                <UserCircle className={`absolute left-4 top-4.5 ${isMatriculaLocked ? 'text-slate-300' : 'text-indigo-400'}`} size={22} />
                {isMatriculaLocked && (
                  <button 
                    type="button"
                    onClick={() => setIsMatriculaLocked(false)}
                    className="absolute right-4 top-3.5 px-4 py-1.5 bg-white border border-slate-200 text-[9px] font-black text-slate-500 rounded-xl hover:text-indigo-600 hover:border-indigo-600 transition-all uppercase"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                <Calendar size={14} className="text-indigo-400" /> Data da Inspeção
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  required
                  value={entryDate} 
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full p-4 bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl pl-12 font-black text-lg text-indigo-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                />
                <Calendar className="absolute left-4 top-4.5 text-indigo-400" size={20} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                <MapPin size={14} className="text-indigo-400" /> Posto de Trabalho
              </label>
              <div className="relative">
                <select 
                  value={area} 
                  onChange={(e) => setArea(e.target.value as Area)} 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                >
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <MapPin className="absolute left-4 top-4.5 text-indigo-400" size={20} />
                <div className="absolute right-4 top-5 pointer-events-none text-slate-400"><ChevronRight size={16} className="rotate-90" /></div>
              </div>
            </div>

            <div className="col-span-full space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                <Clock size={14} className="text-indigo-400" /> Horário da Inspeção (Slots Rápidos)
              </label>
              
              <div className="flex flex-wrap gap-2 pb-2">
                {PRESET_TIME_SLOTS.map((slot) => {
                  const isActive = startTime === slot.start && endTime === slot.end;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => handleSelectSlot(slot.start, slot.end)}
                      className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-300'}`}
                    >
                      {slot.start} - {slot.end}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 group">
                  <span className="text-[9px] font-black text-slate-400 uppercase ml-2">Personalizado Início</span>
                  <div className="relative">
                    <input 
                      type="time" 
                      required 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl pl-12 font-black text-lg text-slate-900 outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                    <Timer className="absolute left-4 top-4.5 text-slate-300" size={20} />
                  </div>
                </div>
                <div className="space-y-2 group">
                  <span className="text-[9px] font-black text-slate-400 uppercase ml-2">Personalizado Fim</span>
                  <div className="relative">
                    <input 
                      type="time" 
                      required 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl pl-12 font-black text-lg text-slate-900 outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                    <Timer className="absolute left-4 top-4.5 text-slate-300" size={20} />
                  </div>
                </div>
              </div>
            </div>

            {isAtuacaoArea && (
              <div className="col-span-full p-8 bg-indigo-50/50 border-2 border-indigo-100 rounded-[40px] animate-in zoom-in-95 duration-300 space-y-4 shadow-inner">
                <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest block flex items-center gap-2">
                  <History size={16} /> Local de Atuação (Seção)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentAtuacaoOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAtuacao(opt)}
                      className={`text-left p-4 rounded-2xl border-2 text-[10px] font-black transition-all ${atuacao === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-300'}`}
                    >
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`col-span-full p-6 rounded-[32px] transition-all border-2 flex items-center justify-between group ${isReinspection ? 'bg-amber-50 border-amber-300 shadow-md' : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl transition-all ${isReinspection ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-slate-200 text-slate-400'}`}>
                  <RotateCcw size={22} className={isReinspection ? 'animate-spin-slow' : ''} />
                </div>
                <div>
                  <h4 className={`text-lg font-black uppercase tracking-tight ${isReinspection ? 'text-amber-800' : 'text-slate-500'}`}>Reinspeção</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReinspection(!isReinspection)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all border-2 ${isReinspection ? 'bg-amber-600 border-amber-400' : 'bg-slate-300 border-slate-200'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all ${isReinspection ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Modelo</label>
              <div className="flex gap-3">
                {MODELS.map(m => (
                  <button key={m} type="button" onClick={() => setModel(m)} className={`flex-1 py-4 px-2 rounded-2xl border-2 font-black text-sm transition-all shadow-sm ${model === m ? 'bg-indigo-600 border-indigo-600 text-white scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Quantidade</label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400"><Minus size={20}/></button>
                <div className="flex-1 bg-slate-900 text-white rounded-2xl h-14 flex items-center justify-center">
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-center text-2xl font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  />
                </div>
                <button type="button" onClick={() => setQuantity(q => q+1)} className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400"><Plus size={20}/></button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">VIN {isVinRequired && '(Obrigatório)'}</label>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={vin} 
                  required={isVinRequired}
                  onChange={(e) => setVin(e.target.value.toUpperCase())} 
                  placeholder={isVinRequired ? "VIN Obrigatório" : "VIN (Opcional)"}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] pl-14 font-mono font-black text-xl text-slate-800 outline-none focus:border-indigo-500 shadow-inner"
                />
                <Search className="absolute left-5 top-5.5 text-slate-300" size={24} />
              </div>
              <button type="button" onClick={() => setShowScanner(true)} className="w-20 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center active:scale-90"><Scan size={32} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6">
            <button type="button" onClick={() => setStatus('OK')} className={`flex flex-col items-center p-8 rounded-[40px] border-4 transition-all ${status === 'OK' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xl scale-105' : 'bg-white border-slate-100 text-slate-300 opacity-40'}`}>
              <CheckCircle size={56} className="mb-3" />
              <span className="font-black text-xl italic">APROVADO OK</span>
            </button>
            <button type="button" onClick={() => setStatus('NOT_OK')} className={`flex flex-col items-center p-8 rounded-[40px] border-4 transition-all ${status === 'NOT_OK' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-2xl scale-105' : 'bg-white border-slate-100 text-slate-300 opacity-40'}`}>
              <AlertCircle size={56} className="mb-3" />
              <span className="font-black text-xl italic">REPROVADO NOK</span>
            </button>
          </div>

          <div className="space-y-6">
            {status === 'OK' && area === 'Inspeção OffLine' && (
              <div className="space-y-4">
                <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest block italic">Detalhes da Liberação</label>
                <textarea value={liberado} onChange={(e) => setLiberado(e.target.value)} rows={3} placeholder="Descreva o que foi liberado..." className="w-full p-6 bg-white border-4 border-emerald-100 rounded-[32px] font-bold text-slate-700 shadow-lg outline-none" />
              </div>
            )}
            {status === 'NOT_OK' && (
              <div className="space-y-4">
                <label className="text-[11px] font-black text-orange-600 uppercase tracking-widest block italic">Descrição do Defeito</label>
                <textarea required value={defectType} onChange={(e) => setDefectType(e.target.value)} rows={4} placeholder="Descreva o defeito..." className="w-full p-6 bg-white border-4 border-orange-100 rounded-[32px] font-bold text-slate-700 shadow-lg outline-none" />
              </div>
            )}
          </div>

          <div className="pt-8">
            <button type="submit" className={`w-full py-6 rounded-[32px] font-black text-2xl shadow-2xl transition-all transform active:scale-95 text-white ${status === 'NOT_OK' ? 'bg-orange-600 shadow-orange-100' : 'bg-emerald-600 shadow-emerald-100'}`}>
              {editingRecord ? 'ATUALIZAR REGISTRO' : 'FINALIZAR INSPEÇÃO'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 italic"><History size={24} className="text-indigo-600" /> MEUS LANÇAMENTOS</h3>
          <button onClick={() => exportOperatorLogToPDF(employeeId, employeeRecentLogs)} className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-2xl uppercase"><FileDown size={14}/></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Data / Hora</th>
                <th className="px-8 py-5">Setor</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Modelo / VIN</th>
                <th className="px-8 py-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeeRecentLogs.length > 0 ? employeeRecentLogs.slice(0, 15).map((record) => (
                <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col text-[11px]">
                      <span className="font-black text-indigo-600">{new Date(record.timestamp).toLocaleDateString('pt-BR')}</span>
                      <span className="font-bold text-slate-700">{record.timeSlot || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-[11px] font-black uppercase">{record.area}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black ${record.type === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                      {record.type} {record.isReinspection && 'RE'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs font-black">{record.model}</div>
                    <div className="text-[10px] font-mono text-slate-400">{record.vin || '-'}</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditClick(record, record.type)} className="p-2 text-indigo-600"><Pencil size={18}/></button>
                      <button onClick={() => record.type === 'OK' ? onRemoveOK(record.id) : onRemoveDefect(record.id)} className="p-2 text-rose-400"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-8 py-16 text-center text-slate-400 font-bold italic">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showScanner && <Scanner onScan={(res) => { setVin(res); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
    </div>
  );
};

export default EntryForm;