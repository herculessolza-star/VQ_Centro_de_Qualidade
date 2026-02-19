
import { DefectRecord, OKCarRecord, DowntimeRecord } from '../types';

export const generateWhatsAppReport = (
  defects: DefectRecord[],
  okCars: OKCarRecord[],
  downtime: DowntimeRecord[],
  areaName: string = "Geral"
) => {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const totalOk = okCars.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalDefects = defects.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalDowntimeMin = downtime.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalDowntimeH = (totalDowntimeMin / 60).toFixed(1);

  const totalReinspections = [
    ...okCars.filter(o => o.isReinspection),
    ...defects.filter(d => d.isReinspection)
  ].reduce((acc, curr) => acc + curr.quantity, 0);

  // Model breakdown
  const models = ['EQE', 'SA2', 'HA2'] as const;
  const modelStats = models.map(m => {
    const ok = okCars.filter(o => o.model === m).reduce((s, o) => s + o.quantity, 0);
    const def = defects.filter(d => d.model === m).reduce((s, d) => s + d.quantity, 0);
    return `*${m}*: OK: ${ok} | Def: ${def}`;
  }).join('\n');

  // Liberados breakdown (Inspeção OffLine)
  const areaFilter = areaName === "Geral" ? "" : ` (${areaName})`;
  const liberadosCount = [
    ...okCars.filter(o => o.area === 'Inspeção OffLine' && o.liberado),
    ...defects.filter(d => d.area === 'Inspeção OffLine' && d.liberado)
  ].length;

  // Top 3 Defects
  const defectMap: Record<string, number> = {};
  defects.forEach(d => {
    const type = d.defectType.trim().toUpperCase();
    defectMap[type] = (defectMap[type] || 0) + d.quantity;
  });
  const top3 = Object.entries(defectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, val], i) => `${i+1}º ${name} (${val})`)
    .join('\n');

  const text = `
🚀 *Centro de Qualidade VQ - Setor: ${areaName}*
📅 *Data:* ${dateStr}

✅ *Produção Total:* ${totalOk} unidades
⚠️ *Defeitos Totais:* ${totalDefects} ocorrências
🔄 *Reinspeções:* ${totalReinspections} veículos
📦 *Inspeção OffLine:* ${liberadosCount} itens liberados
⏱️ *Parada Total:* ${totalDowntimeH} horas

📊 *Resumo por Modelo:*
${modelStats}

🔝 *Top 3 Defeitos:*
${top3 || 'Nenhum defeito registrado'}

🛑 *Eventos de Parada:* ${downtime.length}

_Relatório filtrado via VQ Management System_
  `;

  const encodedText = encodeURIComponent(text.trim());
  window.open(`https://wa.me/?text=${encodedText}`, '_blank');
};
