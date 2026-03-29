import { useState, useEffect, useCallback, useRef } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Select, DataTable, Badge, Loading, Modal, Input } from '../../components/ui';
import { auditLogService } from '../../services';
import { formatDateTime, formatDateShort } from '../../utils/formatters';
import { FiDownload, FiFileText, FiPlus, FiEdit2, FiTrash2, FiChevronRight, FiX, FiFile, FiCalendar } from 'react-icons/fi';
import html2pdf from 'html2pdf.js';

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
    let wrapper = null;
    try {
      const contentEl = modalContentRef.current;
      if (!contentEl) {
        throw new Error('Content not found');
      }

      wrapper = document.createElement('div');
      wrapper.style.cssText = 'padding: 24px; background: #ffffff; width: 210mm; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #334155;';

      const title = document.createElement('h2');
      title.textContent = 'Audit Log Details';
      title.style.cssText = 'font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;';
      wrapper.appendChild(title);

      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;';

      const addField = (label, value) => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;';
        div.innerHTML = `<div style="font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">${label}</div><div style="font-size: 14px; font-weight: 500; color: #1e293b;">${value || 'N/A'}</div>`;
        grid.appendChild(div);
      };

      addField('Horodatage', formatDateTime(log.createdAt));
      addField('Action', log.action || 'N/A');
      addField('Categorie', log.entity || '-');
      addField('Utilisateur', log.userId?.name || log.userId?.email || 'Systeme');
      addField('Adresse IP', log.ipAddress || '-');
      addField('ID Entite', log.entityId?.toString() || '-');
      wrapper.appendChild(grid);

      const changesSection = document.createElement('div');
      changesSection.style.cssText = 'margin-bottom: 20px;';
      const changesLabel = document.createElement('div');
      changesLabel.style.cssText = 'font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px;';
      changesLabel.textContent = 'Donnees modifiees';
      changesSection.appendChild(changesLabel);

      const changesBox = document.createElement('div');
      changesBox.style.cssText = 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;';

      if (log.changes && typeof log.changes === 'object') {
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';
        Object.entries(log.changes).forEach(([key, value], index, arr) => {
          const tr = document.createElement('tr');
          tr.style.cssText = index < arr.length - 1 ? 'border-bottom: 1px solid #e2e8f0;' : '';
          const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          tr.innerHTML = `<td style="padding: 8px 0; font-weight: 500; color: #475569; text-transform: capitalize; width: 35%;">${displayKey}</td><td style="padding: 8px 0; color: #1e293b;">${typeof value === 'object' ? JSON.stringify(value, null, 2).replace(/\n/g, '<br>') : value}</td>`;
          table.appendChild(tr);
        });
        changesBox.appendChild(table);
      } else {
        changesBox.innerHTML = '<div style="color: #94a3b8; font-style: italic;">Aucune donnee disponible</div>';
      }
      changesSection.appendChild(changesBox);
      wrapper.appendChild(changesSection);

      if (log.userAgent) {
        const uaSection = document.createElement('div');
        uaSection.innerHTML = `<div style="font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px;">User Agent</div><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 11px; color: #64748b; word-break: break-all;">${log.userAgent}</div>`;
        wrapper.appendChild(uaSection);
      }

      const footer = document.createElement('div');
      footer.style.cssText = 'margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center;';
      footer.textContent = `Genere le ${formatDateTime(new Date())}`;
      wrapper.appendChild(footer);

      document.body.appendChild(wrapper);

      const opt = {
        margin: 10,
        filename: `audit-log-${log._id || Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(wrapper).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la generation du PDF: ' + error.message);
    } finally {
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
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
