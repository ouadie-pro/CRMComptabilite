import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const formatCurrencyPDF = (amount, currency = 'MAD') => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
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

const getStatusLabel = (status) => {
  const labels = {
    'brouillon': 'Brouillon',
    'envoyé': 'Envoyé',
    'payé': 'Payé',
    'en_retard': 'En retard',
    'annulé': 'Annulé',
  };
  return labels[status] || status || '-';
};

const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export const generateInvoicePDF = (invoice, settings = {}) => {
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
  const companyPhone = company.phone ? `Tél: ${company.phone}` : '';
  
  // A4 dimensions
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm
  
  // Colors
  const primaryColor = [44, 62, 80];
  const secondaryColor = [52, 73, 94];
  const lightGray = [245, 247, 250];
  const borderColor = [200, 200, 200];
  
  let currentY = margin;

  // ==================== HEADER ====================
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(companyName, margin, 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let headerY = 18;
  if (companyAddress) {
    doc.text(companyAddress, margin, headerY);
    headerY += 5;
  }
  const headerInfo = [companyICE, companyRC, companyPhone].filter(Boolean).join('  |  ');
  if (headerInfo) {
    doc.text(headerInfo, margin, headerY);
  }

  // Logo
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', pageWidth - 45, 3, 30, 25);
    } catch (e) {
      // Logo failed to load, continue without it
    }
  }

  currentY = 40;

  // ==================== INVOICE TITLE ====================
  doc.setTextColor(...primaryColor);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth - margin, 12, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.number || '', pageWidth - margin, 20, { align: 'right' });

  // ==================== CLIENT & DETAILS BOXES ====================
  const clientBoxWidth = 90;
  const clientBoxHeight = 35;
  
  // Client Box
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, clientBoxWidth, clientBoxHeight, 2, 2, 'FD');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('CLIENT', margin + 4, currentY + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  
  const clientName = truncateText(invoice.clientId?.companyName || 'Client', 30);
  doc.text(clientName, margin + 4, currentY + 13);
  
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  
  if (invoice.clientId?.address) {
    const clientAddr = truncateText(invoice.clientId.address, 38);
    doc.text(clientAddr, margin + 4, currentY + 20);
  }
  if (invoice.clientId?.email) {
    const clientEmail = truncateText(invoice.clientId.email, 38);
    doc.text(clientEmail, margin + 4, currentY + 26);
  }
  if (invoice.clientId?.ice) {
    doc.text(`ICE: ${invoice.clientId.ice}`, margin + 4, currentY + 32);
  }

  // Invoice Details Box
  const detailsBoxX = pageWidth - margin - 75;
  const detailsBoxWidth = 75;
  
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(detailsBoxX, currentY, detailsBoxWidth, clientBoxHeight, 2, 2, 'FD');
  
  doc.setFontSize(7);
  const details = [
    { label: 'Date emission', value: formatDatePDF(invoice.issueDate) },
    { label: 'Date echeance', value: formatDatePDF(invoice.dueDate) },
    { label: 'Statut', value: getStatusLabel(invoice.status) },
  ];
  
  let detailYPos = currentY + 8;
  details.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(item.label + ':', detailsBoxX + 4, detailYPos);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(item.value, detailsBoxX + 42, detailYPos, { maxWidth: 30 });
    
    detailYPos += 10;
  });

  currentY += 42;

  // ==================== TABLE ====================
  const items = invoice.items || invoice.lines || [];
  
  const subtotalHT = items.length > 0 
    ? items.reduce((sum, line) => sum + calculateLineTotal(line), 0)
    : (invoice.subtotalHT || 0);
    
  const totalVAT = items.length > 0 
    ? items.reduce((sum, line) => sum + calculateLineVAT(line), 0)
    : (invoice.totalVat || 0);
    
  const totalTTC = subtotalHT + totalVAT;

  const tableBody = items.length > 0 
    ? items.map(line => {
        const lineTotal = calculateLineTotal(line);
        return [
          truncateText(line.description || line.name || '-', 40),
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
    head: [['Description', 'Qte', 'Prix Unit.', 'TVA', 'Remise', 'Total HT']],
    body: tableBody,
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineColor: borderColor,
      lineWidth: 0.1,
      cellWidth: 'wrap',
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: primaryColor,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    columnStyles: {
      0: { 
        cellWidth: 60, 
        halign: 'left',
        overflow: 'linebreak',
      },
      1: { 
        cellWidth: 15, 
        halign: 'center',
      },
      2: { 
        cellWidth: 30, 
        halign: 'right',
        overflow: 'truncate',
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
        cellWidth: 35, 
        halign: 'right',
        fontStyle: 'bold',
        overflow: 'truncate',
      },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== TOTALS SECTION ====================
  // Check for page break
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = margin;
  }

  // Totals box - aligned to the right
  const totalsBoxWidth = 70;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const totalsBoxHeight = 40;
  
  doc.setDrawColor(...borderColor);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, totalsBoxHeight, 2, 2, 'FD');
  
  // Subtotal row
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Sous-total HT:', totalsBoxX + 4, currentY + 10);
  
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrencyPDF(subtotalHT, currency), totalsBoxX + totalsBoxWidth - 4, currentY + 10, { align: 'right' });
  
  // VAT row
  doc.setTextColor(100, 100, 100);
  doc.text('TVA:', totalsBoxX + 4, currentY + 20);
  
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrencyPDF(totalVAT, currency), totalsBoxX + totalsBoxWidth - 4, currentY + 20, { align: 'right' });
  
  // Divider
  doc.setDrawColor(...borderColor);
  doc.line(totalsBoxX + 4, currentY + 26, totalsBoxX + totalsBoxWidth - 4, currentY + 26);
  
  // Total TTC row
  doc.setFillColor(...primaryColor);
  doc.roundedRect(totalsBoxX + 2, currentY + 29, totalsBoxWidth - 4, 10, 1.5, 1.5, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total TTC:', totalsBoxX + 6, currentY + 36);
  doc.text(formatCurrencyPDF(totalTTC, currency), totalsBoxX + totalsBoxWidth - 6, currentY + 36, { align: 'right' });

  // ==================== NOTES ====================
  if (invoice.notes && invoice.notes.trim()) {
    currentY += totalsBoxHeight + 10;
    
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

  // ==================== FOOTER ====================
  const footerY = pageHeight - 12;
  doc.setFillColor(...primaryColor);
  doc.rect(0, footerY - 3, pageWidth, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  const footerParts = [companyName];
  if (companyAddress) footerParts.push(companyAddress);
  const footerInfo = footerParts.filter(Boolean).join(' - ');
  
  doc.text(footerInfo, pageWidth / 2, footerY, { align: 'center', maxWidth: pageWidth - 20 });
  doc.text('Genere par CRM Comptabilite', pageWidth / 2, footerY + 5, { align: 'center' });

  // Save
  const fileName = `${invoice.number || 'facture'}.pdf`;
  doc.save(fileName);
};

export default generateInvoicePDF;
