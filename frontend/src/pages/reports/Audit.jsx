import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Select, DataTable, Badge, Loading } from '../../components/ui';
import { auditLogService } from '../../services';
import { formatDateTime } from '../../utils/formatters';
import { FiDownload, FiFileText } from 'react-icons/fi';

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        ...(userFilter !== 'all' && { userId: userFilter }),
        ...(typeFilter !== 'all' && { entity: typeFilter }),
        ...(timeFilter !== 'all' && { timeRange: timeFilter }),
      };
      const response = await auditLogService.getAll(params);
      setLogs(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userFilter, typeFilter, timeFilter]);

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
          <span className="text-sm">{row.userId?.name || row.userId?.email || 'Système'}</span>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Catégorie',
      render: (row) => {
        const colors = { Invoice: 'info', Client: 'primary', Product: 'warning', Expense: 'default' };
        return <Badge variant={colors[row.entity] || 'default'}>{row.entity || '-'}</Badge>;
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <span className="text-sm font-medium">{row.action}</span>,
    },
    {
      key: 'changes',
      header: 'Détails',
      render: (row) => (
        <div className="text-xs text-slate-500 max-w-xs">
          {row.changes && <div className="text-green-600">{JSON.stringify(row.changes)}</div>}
          {!row.changes && <span className="italic text-slate-400">N/A</span>}
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'Adresse IP',
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.ipAddress || '-'}</span>,
    },
  ];

  return (
    <PageLayout title="Journal d'Audit">
      <div className="space-y-6">
        <p className="text-slate-500">Surveillez l'activité et les modifications effectuées sur la plateforme.</p>

        {/* Filters */}
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
            <option value="Expense">Dépense</option>
          </Select>
          <Select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="w-48">
            <option value="all">Tout le temps</option>
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm">
              <FiDownload className="text-sm" />
              CSV
            </Button>
            <Button variant="secondary" size="sm">
              <FiFileText className="text-sm" />
              PDF
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loading size="lg" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={logs}
            emptyMessage="Aucun événement trouvé"
          />
        )}
      </div>
    </PageLayout>
  );
};

export default Audit;
