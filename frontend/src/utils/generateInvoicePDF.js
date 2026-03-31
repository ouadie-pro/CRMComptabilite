import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const formatCurrencyPDF = (amount, currency = 'MAD') => {
  const value = amount || 0;
  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(/\s/g, ' ');
  return `${formatted} ${currency}`;
};

export const formatDatePDF = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

const calculateLineTotal = (line) => {
  const quantity = parseFloat(line.quantity) || 0;
  const unitPrice = parseFloat(line.unitPriceHT || line.price) || 0;
  const discount = parseFloat(line.discount) || 0;
  return (quantity * unitPrice) * (1 - discount / 100);
};

const calculateLineVAT = (line) => {
  const totalHT = calculateLineTotal(line);
  const vatRate = parseFloat(line.vatRate) || 0;
  return totalHT * (vatRate / 100);
};

const getStatusConfig = (status) => {
  const configs = {
    'payé': { label: 'Payé', bgColor: [16, 185, 129], textColor: [255, 255, 255] },
    'envoyé': { label: 'Envoyé', bgColor: [245, 158, 11], textColor: [255, 255, 255] },
    'en_retard': { label: 'En retard', bgColor: [239, 68, 68], textColor: [255, 255, 255] },
    'brouillon': { label: 'Brouillon', bgColor: [107, 114, 128], textColor: [255, 255, 255] },
    'annulé': { label: 'Annulé', bgColor: [107, 114, 128], textColor: [255, 255, 255] },
  };
  return configs[status] || { label: status || '-', bgColor: [107, 114, 128], textColor: [255, 255, 255] };
};

const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const loadImageAsBase64 = async (url) => {
  if (!url) return null;
  
  try {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `${BACKEND_URL}${url}`;
    }
    
    const response = await fetch(fullUrl);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
};

export const generateInvoicePDF = async (invoice, settings = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { company = {}, billing = {} } = settings;
  const currency = billing.currency || 'MAD';
  
  const companyName = company.name || 'Votre Entreprise';
  const companyAddress = company.address || '';
  const companyICE = company.ice ? `ICE: ${company.ice}` : '';
  const companyRC = company.rc ? `RC: ${company.rc}` : '';
  const companyIF = company.if ? `IF: ${company.if}` : '';
  const companyPhone = company.phone ? `Tél: ${company.phone}` : '';
  
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  const primaryColor = [30, 58, 95];
  const secondaryColor = [52, 73, 94];
  const lightGray = [240, 244, 255];
  const borderColor = [200, 200, 200];
  
  let currentY = margin;

  let logoBase64 = null;
  if (company.logoUrl) {
    logoBase64 = await loadImageAsBase64(company.logoUrl);
  }

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(companyName, margin, 14);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let headerY = 21;
  if (companyAddress) {
    doc.text(companyAddress, margin, headerY);
    headerY += 5;
  }
  const headerInfo = [companyICE, companyRC, companyIF, companyPhone].filter(Boolean).join('  |  ');
  if (headerInfo) {
    doc.text(headerInfo, margin, headerY);
  }

  if (logoBase64) {
    try {
      const format = logoBase64.includes('data:image/png') ? 'PNG' : 
                     logoBase64.includes('data:image/jpeg') ? 'JPEG' : 
                     logoBase64.includes('data:image/webp') ? 'WEBP' : 'PNG';
      doc.addImage(logoBase64, format, pageWidth - 45, 4, 28, 28, undefined, 'FAST');
    } catch (e) {
      // Silent fail - logo is optional
    }
  }

  currentY = 45;

  const statusConfig = getStatusConfig(invoice.status);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('FACTURE', pageWidth - margin, 12, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.number || '', pageWidth - margin, 21, { align: 'right' });

  doc.setFillColor(...statusConfig.bgColor);
  const statusWidth = doc.getTextWidth(statusConfig.label) + 8;
  doc.roundedRect(pageWidth - margin - statusWidth, 25, statusWidth, 8, 2, 2, 'F');
  doc.setTextColor(...statusConfig.textColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusConfig.label, pageWidth - margin - statusWidth / 2, 30.5, { align: 'center' });

  doc.setTextColor(...primaryColor);

  const clientBoxWidth = 85;
  const clientBoxHeight = 45;
  
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, clientBoxWidth, clientBoxHeight, 3, 3, 'FD');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('CLIENT', margin + 5, currentY + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  
  const clientName = truncateText(invoice.clientId?.companyName || 'Client', 28);
  doc.text(clientName, margin + 5, currentY + 16);
  
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  
  if (invoice.clientId?.contactName) {
    doc.text(truncateText(invoice.clientId.contactName, 38), margin + 5, currentY + 22);
  }
  if (invoice.clientId?.address) {
    doc.text(truncateText(invoice.clientId.address, 38), margin + 5, currentY + 28);
  }
  if (invoice.clientId?.city) {
    doc.text(truncateText(invoice.clientId.city, 38), margin + 5, currentY + 34);
  }
  if (invoice.clientId?.ice) {
    doc.text(`ICE: ${invoice.clientId.ice}`, margin + 5, currentY + 40);
  }

  const detailsBoxX = pageWidth - margin - 80;
  const detailsBoxWidth = 80;
  
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(detailsBoxX, currentY, detailsBoxWidth, clientBoxHeight, 3, 3, 'FD');
  
  doc.setFontSize(7);
  const details = [
    { label: 'Date Emission', value: formatDatePDF(invoice.issueDate) },
    { label: 'Date Echeance', value: formatDatePDF(invoice.dueDate) },
    { label: 'Mode Paiement', value: invoice.paymentTerms || '30 jours' },
  ];
  
  let detailYPos = currentY + 10;
  details.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(item.label + ':', detailsBoxX + 5, detailYPos);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(item.value, detailsBoxX + detailsBoxWidth - 5, detailYPos, { align: 'right' });
    
    detailYPos += 12;
  });

  currentY += 52;

  const items = invoice.items || invoice.lines || [];
  
  const subtotalHT = items.length > 0 
    ? items.reduce((sum, line) => sum + calculateLineTotal(line), 0)
    : (invoice.subtotalHT || 0);
    
  const totalVAT = items.length > 0 
    ? items.reduce((sum, line) => sum + calculateLineVAT(line), 0)
    : (invoice.totalVat || 0);
    
  const totalTTC = subtotalHT + totalVAT;
  const totalPaid = invoice.totalPaid || 0;
  const remainingAmount = totalTTC - totalPaid;

  const tableBody = items.length > 0 
    ? items.map(line => {
        const lineTotal = calculateLineTotal(line);
        return [
          truncateText(line.description || line.name || '-', 35),
          String(line.quantity || 0),
          formatCurrencyPDF(line.unitPriceHT || line.price || 0, currency),
          `${line.vatRate || 0}%`,
          `${line.discount || 0}%`,
          formatCurrencyPDF(lineTotal, currency),
        ];
      })
    : [['Aucun article', '', '', '', '', '']];

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Qte', 'Prix Unit. HT', 'TVA', 'Remise', 'Total HT']],
    body: tableBody,
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 4,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: primaryColor,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    columnStyles: {
      0: { 
        cellWidth: 55, 
        halign: 'left',
      },
      1: { 
        cellWidth: 15, 
        halign: 'center',
      },
      2: { 
        cellWidth: 30, 
        halign: 'right',
      },
      3: { 
        cellWidth: 15, 
        halign: 'center',
      },
      4: { 
        cellWidth: 15, 
        halign: 'center',
      },
      5: { 
        cellWidth: 40, 
        halign: 'right',
        fontStyle: 'bold',
      },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth -2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  if (currentY > pageHeight - 70) {
    doc.addPage();
    currentY = margin;
  }

  const totalsBoxWidth = 75;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const totalsBoxHeight = 50;
  
  doc.setDrawColor(...borderColor);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, totalsBoxHeight, 3, 3, 'FD');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Sous-total HT:', totalsBoxX + 5, currentY + 10);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrencyPDF(subtotalHT, currency), totalsBoxX + totalsBoxWidth - 5, currentY + 10, { align: 'right' });
  
  doc.setTextColor(100, 100, 100);
  doc.text('TVA (20%):', totalsBoxX + 5, currentY + 20);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrencyPDF(totalVAT, currency), totalsBoxX + totalsBoxWidth - 5, currentY + 20, { align: 'right' });
  
  doc.setDrawColor(...borderColor);
  doc.line(totalsBoxX + 5, currentY + 27, totalsBoxX + totalsBoxWidth - 5, currentY + 27);
  
  doc.setFillColor(...primaryColor);
  doc.roundedRect(totalsBoxX + 3, currentY + 30, totalsBoxWidth - 6, 12, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TTC:', totalsBoxX + 7, currentY + 38);
  doc.text(formatCurrencyPDF(totalTTC, currency), totalsBoxX + totalsBoxWidth - 7, currentY + 38, { align: 'right' });

  if (totalPaid > 0 || remainingAmount > 0) {
    currentY += totalsBoxHeight + 8;
    
    doc.setFillColor(240, 244, 255);
    doc.roundedRect(margin, currentY, totalsBoxWidth, 25, 3, 3, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Montant Payé:', margin + 5, currentY + 9);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyPDF(totalPaid, currency), margin + totalsBoxWidth - 5, currentY + 9, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Reste à Payer:', margin + 5, currentY + 19);
    const remainingColor = remainingAmount > 0 ? [239, 68, 68] : primaryColor;
    doc.setTextColor(...remainingColor);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyPDF(remainingAmount, currency), margin + totalsBoxWidth - 5, currentY + 19, { align: 'right' });
  }

  if (invoice.notes && invoice.notes.trim()) {
    currentY += 35;
    
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Notes:', margin, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    
    const notesLines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(notesLines, margin, currentY + 6);
    
    currentY += 6 + notesLines.length * 4;
  }

  const footerY = pageHeight - 10;
  doc.setFillColor(...primaryColor);
  doc.rect(0, footerY - 5, pageWidth, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  const footerLine1 = [companyName, companyAddress].filter(Boolean).join(' - ');
  const footerLine2 = ['ICE: ' + (company.ice || 'N/A'), 'RC: ' + (company.rc || 'N/A'), 'IF: ' + (company.if || 'N/A')].join('  |  ');
  
  doc.text(footerLine1, pageWidth / 2, footerY - 1, { align: 'center', maxWidth: pageWidth - 20 });
  doc.setFontSize(6);
  doc.text(footerLine2, pageWidth / 2, footerY + 4, { align: 'center', maxWidth: pageWidth - 20 });

  const fileName = `${invoice.number || 'facture'}.pdf`;
  doc.save(fileName);
};

export default generateInvoicePDF;
