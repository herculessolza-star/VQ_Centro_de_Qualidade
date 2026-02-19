
declare const html2canvas: any;
declare const jspdf: any;

/**
 * Exporta a visualização atual do Dashboard (captura de tela) para PDF
 */
export const exportDashboardToPDF = async (elementId: string, customFileName?: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Erro: Elemento não encontrado.");
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    const fileName = customFileName || `Dashboard_VQ_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(fileName);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Falha ao gerar o PDF. Verifique os logs do console.");
  }
};

/**
 * Exporta a visualização atual do Dashboard para Imagem (PNG)
 */
export const exportDashboardToImage = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("Erro: Elemento do dashboard não encontrado.");
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const link = document.createElement('a');
    link.download = `Dashboard_VQ_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error("Erro ao gerar Imagem:", error);
    alert("Falha ao gerar a imagem.");
  }
};

/**
 * Exporta uma lista de registros para um PDF formatado (Relatório de Operador)
 */
export const exportOperatorLogToPDF = async (employeeId: string, records: any[]) => {
  if (!records || records.length === 0) {
    alert("Não há lançamentos para exportar.");
    return;
  }

  const reportContainer = document.createElement('div');
  reportContainer.style.position = 'absolute';
  reportContainer.style.left = '-9999px';
  reportContainer.style.top = '0';
  reportContainer.style.width = '800px';
  reportContainer.style.padding = '40px';
  reportContainer.style.background = 'white';
  reportContainer.style.fontFamily = 'Arial, sans-serif';

  const dateStr = new Date().toLocaleDateString('pt-BR');
  
  let html = `
    <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px;">
      <h1 style="color: #1e293b; margin: 0; font-size: 24px;">Relatório Diário de Lançamentos - VQ</h1>
      <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Operador Matrícula: <strong>${employeeId}</strong> | Data: ${dateStr}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f8fafc; text-align: left;">
          <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 10px; color: #475569;">INTERVALO / HORA</th>
          <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 10px; color: #475569;">ÁREA / ATUAÇÃO</th>
          <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 10px; color: #475569;">MODELO</th>
          <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 10px; color: #475569;">STATUS</th>
          <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 10px; color: #475569;">QTD</th>
          <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 10px; color: #475569;">VIN</th>
          <th style="padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 10px; color: #475569;">OBSERVAÇÃO</th>
        </tr>
      </thead>
      <tbody>
  `;

  records.forEach(r => {
    const time = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const statusStyle = r.type === 'OK' ? 'color: #10b981; font-weight: bold;' : 'color: #f97316; font-weight: bold;';
    const detail = r.type === 'NOT_OK' ? (r.defectType || '-') : (r.isReinspection ? 'Reinspeção OK' : 'OK');
    const slotDisplay = r.timeSlot ? `${r.timeSlot}` : time;
    
    // Combina Área e Atuação para a coluna de Área
    const areaAtuacaoDisplay = r.atuacao ? `${r.area} - ${r.atuacao.toUpperCase()}` : r.area;
    
    html += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
           <div style="font-weight: bold;">${slotDisplay}</div>
           <div style="font-size: 9px; color: #94a3b8;">Real: ${time}</div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
           <div style="font-weight: bold;">${areaAtuacaoDisplay}</div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: bold;">${r.model}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; ${statusStyle}">${r.type}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: bold;">${r.quantity || 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 10px; font-family: monospace;">${r.vin || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 10px; color: #64748b;">
           ${detail}
           ${r.liberado ? `<br/><span style="font-size: 8px; color: #4f46e5;">Liberado: ${r.liberado}</span>` : ''}
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <div style="margin-top: 30px; text-align: right; font-size: 10px; color: #94a3b8;">
      Documento gerado eletronicamente via VQ Management
    </div>
  `;

  reportContainer.innerHTML = html;
  document.body.appendChild(reportContainer);

  try {
    const canvas = await html2canvas(reportContainer, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
    
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Log_Operador_VQ_${employeeId}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF do operador:", error);
    alert("Falha ao exportar log.");
  } finally {
    document.body.removeChild(reportContainer);
  }
};
