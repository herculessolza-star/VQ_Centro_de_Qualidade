
import { GoogleGenAI } from "@google/genai";
import { DefectRecord, DowntimeRecord, OKCarRecord } from "../types";

export const generateAIInsights = async (
  defects: DefectRecord[],
  okCars: OKCarRecord[],
  downtime: DowntimeRecord[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const totalOk = okCars.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalDefects = defects.reduce((acc, curr) => acc + curr.quantity, 0);
  const ftt = totalOk + totalDefects > 0 ? ((totalOk / (totalOk + totalDefects)) * 100).toFixed(1) : "0";
  
  const defectMap: Record<string, number> = {};
  defects.forEach(d => {
    const type = d.defectType.trim().toUpperCase();
    defectMap[type] = (defectMap[type] || 0) + d.quantity;
  });
  const topDefects = Object.entries(defectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, val]) => `${name} (${val})`)
    .join(", ");

  const totalDowntime = downtime.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const prompt = `
    Analise estes dados de qualidade:
    - FTT: ${ftt}%
    - Defeitos: ${totalDefects} (Principais: ${topDefects || "Nenhum"})
    - Parada: ${totalDowntime} min.

    Dê 3 direcionamentos curtíssimos e diretos (máximo 7 palavras cada) para ação imediata. Use bullet points simples. Seja ultra-objetivo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Sem recomendações no momento.";
  } catch (error) {
    console.error("Erro na IA:", error);
    return "Erro ao processar insights.";
  }
};
