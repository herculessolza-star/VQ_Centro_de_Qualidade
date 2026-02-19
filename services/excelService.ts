
import { DefectRecord, OKCarRecord, DowntimeRecord } from '../types';

declare const XLSX: any;

export const exportToExcel = (
  defects: DefectRecord[],
  okCars: OKCarRecord[],
  downtime: DowntimeRecord[],
  periodSuffix: string = "Diario",
  areaName: string = "Geral"
) => {
  const wb = XLSX.utils.book_new();

  // Defeitos Sheet
  const defectData = defects.map(d => ({
    Data: new Date(d.timestamp).toLocaleDateString(),
    Horario: new Date(d.timestamp).toLocaleTimeString(),
    Intervalo: d.timeSlot || "N/A",
    Matricula: d.employeeId,
    Modelo: d.model,
    Area: d.area,
    Reinspecao: d.isReinspection ? "Sim" : "Não",
    Atuacao: d.atuacao || "N/A",
    Liberado: d.liberado || "N/A",
    VIN: d.vin,
    Defeito: d.defectType,
    Quantidade: d.quantity
  }));
  const wsDefects = XLSX.utils.json_to_sheet(defectData);
  XLSX.utils.book_append_sheet(wb, wsDefects, `Defeitos_${areaName}`);

  // OK Cars Sheet
  const okData = okCars.map(o => ({
    Data: new Date(o.timestamp).toLocaleDateString(),
    Horario: new Date(o.timestamp).toLocaleTimeString(),
    Intervalo: o.timeSlot || "N/A",
    Matricula: o.employeeId,
    Modelo: o.model,
    Area: o.area,
    Reinspecao: o.isReinspection ? "Sim" : "Não",
    Atuacao: o.atuacao || "N/A",
    Liberado: o.liberado || "N/A",
    VIN: o.vin || "N/A",
    Quantidade: o.quantity
  }));
  const wsOk = XLSX.utils.json_to_sheet(okData);
  XLSX.utils.book_append_sheet(wb, wsOk, `Producao_OK_${areaName}`);

  // Downtime Sheet
  const downtimeData = downtime.map(dt => ({
    Data: new Date(dt.timestamp).toLocaleDateString(),
    Area: dt.area,
    Inicio: dt.startTime,
    Fim: dt.endTime,
    DuracaoMin: dt.durationMinutes,
    Motivo: dt.reason
  }));
  const wsDowntime = XLSX.utils.json_to_sheet(downtimeData);
  XLSX.utils.book_append_sheet(wb, wsDowntime, `Paradas_${areaName}`);

  const cleanAreaName = areaName.replace(/\s+/g, '_');
  const fileName = `Planilha_VQ_${cleanAreaName}_${periodSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
