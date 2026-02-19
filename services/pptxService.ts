
import { DefectRecord, OKCarRecord, DowntimeRecord, Area } from '../types';

declare const PptxGenJS: any;

const AREA_TRANSLATIONS: Record<string, string> = {
  'Geral': '总览 (General)',
  'Linha OK': '合格线 (Linha OK)',
  'Linha de Teste': '测试线 (Linha de Teste)',
  'Teste de Estrada': '路试 (Teste de Estrada)',
  'Teste de Chuva': '淋雨测试 (Teste de Chuva)',
  'Inspeção OffLine': '线下检查 (Inspeção OffLine)'
};

const MODEL_TRANSLATIONS: Record<string, string> = {
  'EQE': 'EQE',
  'SA2': 'SA2',
  'HA2': 'HA2'
};

export const generatePPTReport = (
  defects: DefectRecord[],
  okCars: OKCarRecord[],
  downtime: DowntimeRecord[],
  period: 'WEEKLY' | 'MONTHLY' | 'ANNUAL' = 'WEEKLY',
  areaName: string = "Geral"
) => {
  const pptx = new PptxGenJS();
  const dateNow = new Date();
  const startDate = new Date();
  
  let periodLabelPT = "Semanal";
  let periodLabelCN = "每周";
  let days = 7;

  if (period === 'MONTHLY') {
    periodLabelPT = "Mensal";
    periodLabelCN = "每月";
    days = 30;
  } else if (period === 'ANNUAL') {
    periodLabelPT = "Anual";
    periodLabelCN = "年度";
    days = 365;
  }

  startDate.setDate(dateNow.getDate() - days);

  // Filtrar dados do período selecionado
  const filteredDefects = defects.filter(d => d.timestamp >= startDate.getTime());
  const filteredOk = okCars.filter(o => o.timestamp >= startDate.getTime());
  const filteredDowntime = downtime.filter(dt => dt.timestamp >= startDate.getTime());

  const totalOk = filteredOk.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalDef = filteredDefects.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalMin = filteredDowntime.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalH = (totalMin / 60).toFixed(1);

  const translatedArea = AREA_TRANSLATIONS[areaName] || areaName;

  // 1. Slide de Título / 标题页
  let slide = pptx.addSlide();
  slide.background = { color: "0ea5e9" }; // Soft Blue 500
  slide.addText("BYD - VQ MANAGEMENT", { x: 1, y: 1.0, w: 8, fontSize: 36, color: "FFFFFF", bold: true, align: "center" });
  slide.addText(`Setor / 部门: ${translatedArea}`, { x: 1, y: 1.8, w: 8, fontSize: 24, color: "FFFFFF", align: "center", bold: true });
  slide.addText(`Relatório de Resumo ${periodLabelPT} / ${periodLabelCN}摘要报告`, { x: 1, y: 2.6, w: 8, fontSize: 20, color: "FFFFFF", align: "center" });
  slide.addText(`Período / 期间: ${startDate.toLocaleDateString()} - ${dateNow.toLocaleDateString()}`, { x: 1, y: 3.5, w: 8, fontSize: 16, color: "f0f9ff", align: "center" });

  // 2. Slide de Visão Geral (KPIs) / 关键绩效指标概览
  slide = pptx.addSlide();
  slide.addText(`${translatedArea.toUpperCase()} - PERFORMANCE ${periodLabelPT.toUpperCase()} / ${periodLabelCN}关键指标`, { x: 0.5, y: 0.5, w: 9, fontSize: 20, color: "0c4a6e", bold: true });
  
  // Card OK
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.5, w: 2.8, h: 2.5, fill: { color: "f0f9ff" } });
  slide.addText("PRODUÇÃO OK\n合格产量", { x: 0.6, y: 1.7, w: 2.6, fontSize: 18, color: "0284c7", bold: true, align: "center" });
  slide.addText(totalOk.toString(), { x: 0.6, y: 2.8, w: 2.6, fontSize: 44, color: "0ea5e9", bold: true, align: "center" });

  // Card Defeitos
  slide.addShape(pptx.ShapeType.rect, { x: 3.6, y: 1.5, w: 2.8, h: 2.5, fill: { color: "fff1f2" } });
  slide.addText("DEFEITOS VQ\n质量缺陷", { x: 3.7, y: 1.7, w: 2.6, fontSize: 18, color: "e11d48", bold: true, align: "center" });
  slide.addText(totalDef.toString(), { x: 3.7, y: 2.8, w: 2.6, fontSize: 44, color: "9f1239", bold: true, align: "center" });

  // Card Paradas
  slide.addShape(pptx.ShapeType.rect, { x: 6.7, y: 1.5, w: 2.8, h: 2.5, fill: { color: "f8fafc" } });
  slide.addText("PARADAS (HORAS)\n停机时间 (小时)", { x: 6.8, y: 1.7, w: 2.6, fontSize: 18, color: "475569", bold: true, align: "center" });
  slide.addText(`${totalH}h`, { x: 6.8, y: 2.8, w: 2.6, fontSize: 44, color: "1e293b", bold: true, align: "center" });

  // 3. Slide de Distribuição por Modelo / 按模型分布
  slide = pptx.addSlide();
  slide.addText(`${translatedArea} - PRODUÇÃO POR MODELO / 按车型统计`, { x: 0.5, y: 0.5, w: 9, fontSize: 20, color: "0c4a6e", bold: true });
  
  const models = ['EQE', 'SA2', 'HA2'] as const;
  const modelRows = [
    [
      { text: "MODELO / 车型", options: { bold: true, fill: "0c4a6e", color: "FFFFFF" } }, 
      { text: "OK / 合格", options: { bold: true, fill: "0c4a6e", color: "FFFFFF" } },
      { text: "DEF / 缺陷", options: { bold: true, fill: "0c4a6e", color: "FFFFFF" } },
      { text: "TOTAL / 总计", options: { bold: true, fill: "0c4a6e", color: "FFFFFF" } }
    ]
  ];

  models.forEach(m => {
    const okCount = filteredOk.filter(o => o.model === m).reduce((s, o) => s + o.quantity, 0);
    const defCount = filteredDefects.filter(d => d.model === m).reduce((s, d) => s + d.quantity, 0);
    // Fix: provide all required options (bold, fill, color) to match the type inferred from the header row
    modelRows.push([
      { text: m, options: { bold: true, fill: "f8fafc", color: "0c4a6e" } },
      { text: okCount.toString(), options: { bold: false, fill: "FFFFFF", color: "10b981" } },
      { text: defCount.toString(), options: { bold: false, fill: "FFFFFF", color: "f97316" } },
      { text: (okCount + defCount).toString(), options: { bold: true, fill: "FFFFFF", color: "0c4a6e" } }
    ]);
  });
  slide.addTable(modelRows, { x: 0.5, y: 1.2, w: 9, border: { type: "solid", color: "e2e8f0" }, fontSize: 14 });

  // 4. Slide de Top Defeitos / 主要缺陷分析
  slide = pptx.addSlide();
  slide.addText(`${translatedArea} - PARETO DE DEFEITOS / 缺陷排列图`, { x: 0.5, y: 0.5, w: 9, fontSize: 20, color: "0c4a6e", bold: true });
  
  const defectMap: Record<string, number> = {};
  filteredDefects.forEach(d => {
    const type = d.defectType.trim().toUpperCase();
    defectMap[type] = (defectMap[type] || 0) + d.quantity;
  });
  
  const top10 = Object.entries(defectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (top10.length > 0) {
    const rows = [
      [{ text: "TIPO DE DEFEITO / 缺陷类型", options: { bold: true, fill: "0ea5e9", color: "FFFFFF" } }, 
       { text: "QUANTIDADE / 数量", options: { bold: true, fill: "0ea5e9", color: "FFFFFF" } }]
    ];
    top10.forEach(([name, val]) => rows.push([
      { text: name, options: { bold: false, fill: "FFFFFF", color: "0c4a6e" } }, 
      { text: val.toString(), options: { bold: true, fill: "FFFFFF", color: "0ea5e9" } }
    ]));
    slide.addTable(rows, { x: 0.5, y: 1.2, w: 9, border: { type: "solid", color: "e2e8f0" }, fontSize: 12 });
  } else {
    slide.addText("Sem defeitos registrados no período / 此期间无缺陷记录", { x: 0.5, y: 2, w: 9, fontSize: 18, color: "94a3b8", align: "center" });
  }

  // 5. Slide de Paradas / 停机情况
  slide = pptx.addSlide();
  slide.addText(`${translatedArea} - REGISTRO DE PARADAS / 停机记录`, { x: 0.5, y: 0.5, w: 9, fontSize: 20, color: "0c4a6e", bold: true });

  const areaRows = [
    [{ text: "MOTIVO / 原因", options: { bold: true, fill: "64748b", color: "FFFFFF" } }, 
     { text: "HORÁRIO / 时间", options: { bold: true, fill: "64748b", color: "FFFFFF" } },
     { text: "DURAÇÃO (MIN) / 持续时间", options: { bold: true, fill: "64748b", color: "FFFFFF" } }]
  ];

  filteredDowntime.slice(0, 8).forEach(dt => {
    areaRows.push([
      { text: dt.reason, options: { bold: false, fill: "FFFFFF", color: "0c4a6e" } }, 
      { text: `${dt.startTime} - ${dt.endTime}`, options: { bold: false, fill: "FFFFFF", color: "475569" } },
      { text: dt.durationMinutes.toString(), options: { bold: true, fill: "FFFFFF", color: "475569" } }
    ]);
  });

  if (filteredDowntime.length > 0) {
    slide.addTable(areaRows, { x: 0.5, y: 1.2, w: 9, border: { type: "solid", color: "e2e8f0" }, fontSize: 12 });
  } else {
    slide.addText("Nenhuma parada registrada no período / 此期间无停机记录", { x: 0.5, y: 2, w: 9, fontSize: 18, color: "94a3b8", align: "center" });
  }

  // Finalização e Download
  const cleanAreaName = areaName.replace(/\s+/g, '_');
  pptx.writeFile({ fileName: `Relatorio_Bilingue_VQ_${cleanAreaName}_${periodLabelPT}_${new Date().toISOString().split('T')[0]}.pptx` });
};
