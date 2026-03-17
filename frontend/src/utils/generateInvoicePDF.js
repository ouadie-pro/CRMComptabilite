import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CURRENCY_SYMBOLS = {
  MAD: 'MAD',
  EUR: '€',
  USD: '$',
};

export const formatCurrencyPDF = (amount, currency = 'MAD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDatePDF = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
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

export const generateInvoicePDF = (invoice, settings = {}) => {
  const doc = new jsPDF();
  const { company = {}, billing = {} } = settings;
  const currency = billing.currency || 'MAD';
  const companyName = company.name || 'Votre Entreprise';
  const companyAddress = company.address || '';
  const companyICE = company.ice ? `ICE: ${company.ice}` : '';
  const companyRC = company.rc ? `RC: ${company.rc}` : '';
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // Colors
  const primaryColor = [51, 65, 85]; // slate-700
  const accentColor = [59, 130, 246]; // blue-500
  const lightGray = [241, 245, 249];

  // Header - Company Logo and Name
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, margin, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (companyAddress) {
    doc.text(companyAddress, margin, 26);
  }
  
  // Company additional info
  let infoY = 26;
  if (companyICE || companyRC) {
    const infoParts = [companyICE, companyRC].filter(Boolean).join(' | ');
    doc.text(infoParts, margin, infoY);
  }

  // Logo placeholder (if exists)
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', pageWidth - 45, 5, 30, 25);
    } catch (e) {
      console.log('Logo not loaded:', e);
    }
  }

  currentY = 45;

  // Invoice Title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth - margin, 22, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.number || '', pageWidth - margin, 30, { align: 'right' });

  // Client Information Box
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, currentY, 90, 40, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('CLIENT', margin + 5, currentY + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(invoice.clientId?.companyName || 'Client', margin + 5, currentY + 16);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (invoice.clientId?.address) {
    doc.text(invoice.clientId.address, margin + 5, currentY + 22);
  }
  if (invoice.clientId?.email) {
    doc.text(invoice.clientId.email, margin + 5, currentY + 28);
  }
  if (invoice.clientId?.ice) {
    doc.text(`ICE: ${invoice.clientId.ice}`, margin + 5, currentY + 34);
  }

  // Invoice Details Box
  const detailsX = pageWidth - margin - 85;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(detailsX, currentY, 85, 40, 3, 3, 'FD');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  
  const detailItems = [
    { label: 'Date d\'émission', value: formatDatePDF(invoice.issueDate) },
    { label: 'Date échéance', value: formatDatePDF(invoice.dueDate) },
    { label: 'Statut', value: getStatusLabel(invoice.status) },
  ];
  
  let detailY = currentY + 10;
  detailItems.forEach((item, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label + ':', detailsX + 5, detailY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(item.value, detailsX + 45, detailY);
    detailY += 10;
  });

  currentY += 50;

  // Invoice Items Table
  const items = invoice.items || invoice.lines || [];
  
  // Calculate totals from line items (recalculate for accuracy)
  const calculatedSubtotal = items.reduce((sum, line) => sum + calculateLineTotal(line), 0);
  const calculatedVAT = items.reduce((sum, line) => sum + calculateLineVAT(line), 0);
  const calculatedTotal = calculatedSubtotal + calculatedVAT;
  
  // Use provided totals if line items are empty
  const subtotalHT = items.length > 0 ? calculatedSubtotal : (invoice.subtotalHT || 0);
  const totalVAT = items.length > 0 ? calculatedVAT : (invoice.totalVat || 0);
  const totalTTC = items.length > 0 ? calculatedTotal : (invoice.totalTTC || 0);

  const tableData = items.length > 0 ? items.map(line => {
    const totalHT = calculateLineTotal(line);
    const vatAmount = calculateLineVAT(line);
    return [
      line.description || line.name || '-',
      line.quantity || 0,
      formatCurrencyPDF(line.unitPriceHT || line.price || 0, currency),
      `${line.vatRate || 0}%`,
      `${line.discount || 0}%`,
      formatCurrencyPDF(totalHT, currency),
    ];
  }) : [['Aucun article', '', '', '', '', '']];

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Qté', 'Prix Unit.', 'TVA', 'Remise', 'Total HT']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: primaryColor,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    columnStyles: {
      0: { cellWidth: 65, halign: 'left' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer on each page
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

  currentY = doc.lastAutoTable.finalY + 15;

  // Check if we need a new page for totals
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = margin;
  }

  // Totals Section
  const totalsX = pageWidth - margin - 80;
  const totalsWidth = 80;
  
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(totalsX - 5, currentY - 5, totalsWidth + 10, 45, 2, 2, 'FD');
  
  // Subtotal
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Sous-total HT:', totalsX, currentY + 5);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrencyPDF(subtotalHT, currency), totalsX + totalsWidth, currentY + 5, { align: 'right' });
  
  // VAT
  doc.setTextColor(100, 116, 139);
  doc.text('TVA:', totalsX, currentY + 15);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrencyPDF(totalVAT, currency), totalsX + totalsWidth, currentY + 15, { align: 'right' });
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX, currentY + 22, totalsX + totalsWidth, currentY + 22);
  
  // Total
  doc.setFillColor(...primaryColor);
  doc.roundedRect(totalsX - 5, currentY + 25, totalsWidth + 10, 15, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total TTC:', totalsX, currentY + 35);
  doc.text(formatCurrencyPDF(totalTTC, currency), totalsX + totalsWidth, currentY + 35, { align: 'right' });

  // Notes Section
  if (invoice.notes) {
    currentY += 60;
    
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
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - margin * 2);
    doc.text(splitNotes, margin, currentY + 7);
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFillColor(...primaryColor);
  doc.rect(0, footerY - 5, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const footerText = [
    companyName,
    companyAddress,
    companyICE && companyRC ? `${companyICE} | ${companyRC}` : (companyICE || companyRC || ''),
  ].filter(Boolean).join(' | ');
  
  doc.text(footerText, pageWidth / 2, footerY + 2, { align: 'center' });
  doc.text('Généré par CRM Comptabilite', pageWidth / 2, footerY + 10, { align: 'center' });

  // Save the PDF
  const fileName = `${invoice.number || 'facture'}.pdf`;
  doc.save(fileName);
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

export default generateInvoicePDF;
