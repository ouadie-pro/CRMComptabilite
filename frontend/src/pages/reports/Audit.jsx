import { useState, useEffect, useCallback, useRef } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Select, DataTable, Badge, Loading, Modal, Input } from '../../components/ui';
import { auditLogService } from '../../services';
import { formatDateTime, formatDateShort } from '../../utils/formatters';
import { FiDownload, FiFileText, FiPlus, FiEdit2, FiTrash2, FiChevronRight, FiX, FiFile, FiCalendar } from 'react-icons/fi';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../../utils/formatters';

const sanitizeHTML = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
};

const formatFieldValue = (value, key) => {
  if (value === null || value === undefined) return <span className="text-slate-400 italic">Non defini</span>;
  
  const importantKeys = ['amount', 'total', 'price', 'quantity', 'status', 'date', 'name', 'email', 'phone'];
  const isImportant = importantKeys.some(k => key.toLowerCase().includes(k));
  
  if (typeof value === 'object') {
    return <pre className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded overflow-auto max-h-20">{JSON.stringify(value, null, 2)}</pre>;
  }
  
  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'success' : 'danger'}>{value ? 'Oui' : 'Non'}</Badge>;
  }
  
  if (isImportant) {
    return <span className="font-semibold text-primary">{sanitizeHTML(String(value))}</span>;
  }
  
  return <span>{sanitizeHTML(String(value))}</span>;
};

const getActionIcon = (action) => {
  if (action?.toLowerCase().includes('create') || action?.toLowerCase().includes('add') || action?.toLowerCase().includes('ajout')) {
    return <FiPlus className="text-sm text-green-600" />;
  }
  if (action?.toLowerCase().includes('update') || action?.toLowerCase().includes('edit') || action?.toLowerCase().includes('modif')) {
    return <FiEdit2 className="text-sm text-blue-600" />;
  }
  if (action?.toLowerCase().includes('delete') || action?.toLowerCase().includes('remove') || action?.toLowerCase().includes('supprim')) {
    return <FiTrash2 className="text-sm text-red-600" />;
  }
  return <FiChevronRight className="text-sm text-slate-400" />;
};

const DetailsModal = ({ log, isOpen, onClose }) => {
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const modalContentRef = useRef(null);

  if (!log) return null;

  const downloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      const navyBlue = '#1e3a5f';
      const grayColor = '#6b7280';
      const lightGray = '#f3f4f6';

      doc.setFillColor(navyBlue);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Cabinet Atlas Comptabilite', margin, yPos + 8);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Journal d\'Audit - Detail de l\'activite', pageWidth - margin, yPos + 8, { align: 'right' });

      yPos = 45;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Journal d\'Audit - Detail de l\'activite', pageWidth / 2, yPos, { align: 'center' });

      yPos += 10;

      doc.setDrawColor(navyBlue);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      yPos += 10;

      doc.setFontSize(8);
      doc.setTextColor(grayColor);
      doc.text(`Genere le: ${formatDateTime(new Date())}`, pageWidth - margin, yPos, { align: 'right' });

      yPos += 15;

      autoTable(doc, {
        startY: yPos,
        head: [['Champ', 'Valeur']],
        body: [
          ['Horodatage', formatDateTime(log.createdAt)],
          ['Action', log.action || '-'],
          ['Categorie', log.entity || '-'],
          ['Utilisateur', log.userId?.name || log.userId?.email || 'Systeme'],
          ['Adresse IP', log.ipAddress || '-'],
          ['ID Entite', log.entityId?.toString() || '-'],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: navyBlue,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold', textColor: grayColor },
          1: { cellWidth: 'auto' },
        },
        alternateRowStyles: {
          fillColor: lightGray,
        },
        margin: { left: margin, right: margin },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      if (log.changes && typeof log.changes === 'object') {
        const changesData = Object.entries(log.changes).map(([key, value]) => {
          const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          return [displayKey, displayValue];
        });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Donnees Modifiees', margin, yPos);

        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Champ', 'Valeur']],
          body: changesData,
          theme: 'striped',
          headStyles: {
            fillColor: navyBlue,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 45, fontStyle: 'bold' },
            1: { cellWidth: 'auto' },
          },
          alternateRowStyles: {
            fillColor: lightGray,
          },
          margin: { left: margin, right: margin },
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }

      if (log.userAgent) {
        doc.setFontSize(9);
        doc.setTextColor(grayColor);
        doc.setFont('helvetica', 'bold');
        doc.text('USER AGENT:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const userAgentLines = doc.splitTextToSize(log.userAgent, contentWidth);
        doc.text(userAgentLines, margin, yPos + 5);
        yPos += 5 + (userAgentLines.length * 4);
      }

      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      doc.setDrawColor(grayColor);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

      doc.setFontSize(8);
      doc.setTextColor(grayColor);
      doc.setFont('helvetica', 'normal');
      doc.text('Document genere par CRM Comptabilite', pageWidth / 2, pageHeight - 18, { align: 'center' });
      doc.text(`Page 1/1`, pageWidth - margin, pageHeight - 18, { align: 'right' });

      doc.save(`audit-log-${log._id || Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la generation du PDF: ' + error.message);
    } finally {
      setDownloadingPDF(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Details de l'activite" size="lg">
      <div ref={modalContentRef} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Horodatage</label>
            <p className="font-medium">{formatDateTime(log.createdAt)}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Action</label>
            <p className="font-medium flex items-center gap-2">
              {getActionIcon(log.action)}
              {sanitizeHTML(log.action || 'N/A')}
            </p>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Categorie</label>
            <p><Badge variant={log.entity === 'Invoice' ? 'info' : log.entity === 'Client' ? 'primary' : log.entity === 'Expense' ? 'warning' : 'default'}>{sanitizeHTML(log.entity || '-')}</Badge></p>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Utilisateur</label>
            <p className="font-medium">{sanitizeHTML(log.userId?.name || log.userId?.email || 'Systeme')}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Adresse IP</label>
            <p className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded inline-block">{sanitizeHTML(log.ipAddress || '-')}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">ID Entite</label>
            <p className="font-mono text-xs">{log.entityId ? sanitizeHTML(log.entityId.toString()) : '-'}</p>
          </div>
        </div>
        
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Donnees modifiees</label>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            {log.changes && typeof log.changes === 'object' ? (
              <div className="space-y-2">
                {Object.entries(log.changes).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4 py-1 border-b border-slate-200 dark:border-slate-700 last:border-0">
                    <dt className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{sanitizeHTML(key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' '))}</dt>
                    <dd className="col-span-2 text-sm">{formatFieldValue(value, key)}</dd>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">Aucune donnee disponible</p>
            )}
          </div>
        </div>
        
        {log.userAgent && (
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide block mb-1">User Agent</label>
            <p className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 p-2 rounded break-all">{sanitizeHTML(log.userAgent)}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700" data-hide-pdf>
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
        <Button onClick={downloadPDF} loading={downloadingPDF}>
          <FiDownload className="text-sm" />
          Telecharger PDF
        </Button>
      </div>
    </Modal>
  );
};

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (userFilter !== 'all') params.userId = userFilter;
      if (typeFilter !== 'all') params.entity = typeFilter;
      
      if (showCustomDate && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else if (timeFilter !== 'all') {
        params.timeRange = timeFilter;
      }
      
      const response = await auditLogService.getAll(params);
      setLogs(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userFilter, typeFilter, timeFilter, customStartDate, customEndDate]);

  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);
    if (value === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleRowClick = useCallback((log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  }, []);

  const downloadJSON = useCallback((log) => {
    const data = JSON.stringify(log, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${log._id || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadPDF = useCallback((log) => {
    const content = `
Audit Log - ${formatDateTime(log.createdAt)}
${'='.repeat(50)}

Action: ${log.action}
Categorie: ${log.entity}
Utilisateur: ${log.userId?.name || log.userId?.email || 'Systeme'}
Adresse IP: ${log.ipAddress || '-'}
ID Entite: ${log.entityId || '-'}

Donnees modifiees:
${log.changes ? JSON.stringify(log.changes, null, 2) : 'N/A'}

${log.userAgent ? `User Agent: ${log.userAgent}` : ''}
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${log._id || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadAllJSON = useCallback(() => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${formatDateShort(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logs]);

  const downloadAllCSV = useCallback(() => {
    const headers = ['Date', 'Utilisateur', 'Catégorie', 'Action', 'Adresse IP', 'ID Entité'];
    
    const data = logs.map(log => [
      formatDateTime(log.createdAt),
      log.userId?.name || log.userId?.email || 'Système',
      log.entity || '-',
      log.action || '-',
      log.ipAddress || '-',
      log.entityId?.toString() || '-',
    ]);
    
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    ws['!cols'] = [
      { wch: 28 },
      { wch: 20 },
      { wch: 12 },
      { wch: 30 },
      { wch: 15 },
      { wch: 35 },
    ];
    
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    
    const wsDom = document.createElement('div');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const filename = `audit-logs-${day}_${month}_${year}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  }, [logs]);

  const entityColors = {
    Invoice: 'info',
    Client: 'primary',
    Product: 'warning',
    Expense: 'danger',
  };

  const columns = [
    {
      key: 'createdAt',
      header: 'Horodatage',
      render: (row) => <span className="text-sm">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'userId',
      header: 'Utilisateur',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
            {row.userId?.name?.charAt(0) || row.userId?.email?.charAt(0) || 'U'}
          </div>
          <span className="text-sm">{sanitizeHTML(row.userId?.name || row.userId?.email || 'Systeme')}</span>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Categorie',
      render: (row) => (
        <Badge variant={entityColors[row.entity] || 'default'}>
          {sanitizeHTML(row.entity || '-')}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <div className="flex items-center gap-2">
          {getActionIcon(row.action)}
          <span className="text-sm font-medium">{sanitizeHTML(row.action || '-')}</span>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
          {sanitizeHTML(row.ipAddress || '-')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (row) => (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); downloadJSON(row); }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            title="Telecharger JSON"
          >
            <FiFileText className="text-xs" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); downloadPDF(row); }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            title="Telecharger PDF (TXT)"
          >
            <FiDownload className="text-xs" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleRowClick(row); }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            title="Voir details"
          >
            <FiChevronRight className="text-xs" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout title="Journal d'Audit">
      <div className="space-y-6">
        <p className="text-slate-500">Surveillez l'activite et les modifications effectuees sur la plateforme.</p>

        <div className="flex flex-wrap gap-4 items-center">
          <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="w-48">
            <option value="all">Tous les utilisateurs</option>
            <option value="admin">Administrateur</option>
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-48">
            <option value="all">Tous les types</option>
            <option value="Client">Client</option>
            <option value="Invoice">Facture</option>
            <option value="Product">Produit</option>
            <option value="Expense">Depense</option>
          </Select>
          <Select value={showCustomDate ? 'custom' : timeFilter} onChange={(e) => handleTimeFilterChange(e.target.value)} className="w-48">
            <option value="all">Tout le temps</option>
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="last_month">Mois precedent</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette annee</option>
          </Select>
          
          {showCustomDate && (
            <div className="flex items-center gap-2">
              <FiCalendar className="text-slate-400" />
              <input
                type="month"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800"
              />
              <span className="text-slate-500">a</span>
              <input
                type="month"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800"
              />
            </div>
          )}
          
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={downloadAllCSV}>
              <FiDownload className="text-sm" />
              Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={downloadAllJSON}>
              <FiDownload className="text-sm" />
              JSON
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-medium">{logs.length}</span>
          <span>evenements trouves</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loading size="lg" /></div>
        ) : (
          <div 
            onClick={() => {}}
            className="cursor-pointer"
          >
            <DataTable
              columns={columns}
              data={logs}
              emptyMessage="Aucun evenement trouve"
              onRowClick={handleRowClick}
              rowClassName="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            />
          </div>
        )}
      </div>

      <DetailsModal
        log={selectedLog}
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedLog(null); }}
      />
    </PageLayout>
  );
};

export default Audit;
