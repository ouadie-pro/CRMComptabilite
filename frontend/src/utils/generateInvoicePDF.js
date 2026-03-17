import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const formatCurrencyPDF = (amount, currency = 'MAD') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
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
  const contentWidth = pageWidth - margin * 2;
  
  // Colors
  const primaryColor = [44, 62, 80];
  const secondaryColor = [52, 73, 94];
  const lightGray = [245, 247, 250];
  const borderColor = [200, 200, 200];
  
  let currentY = margin;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(companyName, margin, 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let headerY = 22;
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

  currentY = 42;

  // Invoice Title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth - margin, 15, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.number || '', pageWidth - margin, 23, { align: 'right' });

  // Client Info Box
  const clientBoxWidth = 95;
  const clientBoxHeight = 38;
  
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, clientBoxWidth, clientBoxHeight, 2, 2, 'FD');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('CLIENT', margin + 5, currentY + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  
  const clientName = truncateText(invoice.clientId?.companyName || 'Client', 35);
  doc.text(clientName, margin + 5, currentY + 14);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  
  if (invoice.clientId?.address) {
    const clientAddr = truncateText(invoice.clientId.address, 40);
    doc.text(clientAddr, margin + 5, currentY + 20);
  }
  if (invoice.clientId?.email) {
    const clientEmail = truncateText(invoice.clientId.email, 40);
    doc.text(clientEmail, margin + 5, currentY + 26);
  }
  if (invoice.clientId?.ice) {
    doc.text(`ICE: ${invoice.clientId.ice}`, margin + 5, currentY + 32);
  }

  // Invoice Details Box
  const detailsBoxX = pageWidth - margin - 80;
  const detailsBoxWidth = 80;
  const detailsBoxHeight = 38;
  
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(detailsBoxX, currentY, detailsBoxWidth, detailsBoxHeight, 2, 2, 'FD');
  
  doc.setFontSize(8);
  const details = [
    { label: 'Date emission', value: formatDatePDF(invoice.issueDate) },
    { label: 'Date echeance', value: formatDatePDF(invoice.dueDate) },
    { label: 'Statut', value: getStatusLabel(invoice.status) },
  ];
  
  let detailYPos = currentY + 7;
  details.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(item.label + ':', detailsBoxX + 5, detailYPos);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(item.value, detailsBoxX + 45, detailYPos, { maxWidth: 32 });
    
    detailYPos += 10;
  });

  currentY += 48;

  // Table
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
          truncateText(line.description || line.name || '-', 45),
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
      cellPadding: 3,
      overflow: 'linebreak',
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
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
        overflow: 'linebreak',
      },
      1: { 
        cellWidth: 18, 
        halign: 'center',
      },
      2: { 
        cellWidth: 28, 
        halign: 'right',
      },
      3: { 
        cellWidth: 18, 
        halign: 'center',
      },
      4: { 
        cellWidth: 18, 
        halign: 'center',
      },
      5: { 
        cellWidth: 28, 
        halign: 'right',
        fontStyle: 'bold',
      },
    },
    margin: { left: margin, right: margin },
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

  currentY = doc.lastAutoTable.finalY + 10;

  // Check for page break
  if (currentY > pageHeight - 70) {
    doc.addPage();
    currentY = margin;
  }

  // Totals Section
  const totalsBoxX = pageWidth - margin - 75;
  const totalsBoxWidth = 75;
  
  doc.setDrawColor(...borderColor);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(totalsBoxX - 3, currentY - 3, totalsBoxWidth + 6, 42, 1.5, 1.5, 'FD');
  
  // Subtotal
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Sous-total HT:', totalsBoxX, currentY + 4);
  
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrencyPDF(subtotalHT, currency), totalsBoxX + totalsBoxWidth, currentY + 4, { align: 'right' });
  
  // VAT
  doc.setTextColor(100, 100, 100);
  doc.text('TVA:', totalsBoxX, currentY + 13);
  
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrencyPDF(totalVAT, currency), totalsBoxX + totalsBoxWidth, currentY + 13, { align: 'right' });
  
  // Divider
  doc.setDrawColor(...borderColor);
  doc.line(totalsBoxX, currentY + 19, totalsBoxX + totalsBoxWidth, currentY + 19);
  
  // Total
  doc.setFillColor(...primaryColor);
  doc.roundedRect(totalsBoxX - 3, currentY + 22, totalsBoxWidth + 6, 12, 1, 1, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total TTC:', totalsBoxX, currentY + 30);
  doc.text(formatCurrencyPDF(totalTTC, currency), totalsBoxX + totalsBoxWidth, currentY + 30, { align: 'right' });

  // Notes
  if (invoice.notes && invoice.notes.trim()) {
    currentY += 55;
    
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Notes:', margin, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    const notesLines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(notesLines, margin, currentY + 7);
    
    currentY += 7 + notesLines.length * 5;
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFillColor(...primaryColor);
  doc.rect(0, footerY - 3, pageWidth, 18, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  const footerParts = [companyName];
  if (companyAddress) footerParts.push(companyAddress);
  const footerInfo = footerParts.filter(Boolean).join(' - ');
  
  doc.text(footerInfo, pageWidth / 2, footerY + 2, { align: 'center', maxWidth: pageWidth - 20 });
  doc.text('Genere par CRM Comptabilite', pageWidth / 2, footerY + 8, { align: 'center' });

  // Save
  const fileName = `${invoice.number || 'facture'}.pdf`;
  doc.save(fileName);
};

export default generateInvoicePDF;
