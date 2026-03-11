import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Badge, Loading } from '../../components/ui';
import { auditLogService } from '../../services';
import { formatDateTime } from '../../utils/formatters';
import { FiDownload, FiFileText } from 'react-icons/fi';

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('30');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        ...(userFilter !== 'all' && { user: userFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(periodFilter && { days: periodFilter }),
      };
      const response = await auditLogService.getAll(params);
      setLogs(response.data || response);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userFilter, typeFilter, periodFilter]);

  const columns = [
    {
      key: 'timestamp',
      header: 'Horodatage',
      render: (row) => <span className="text-sm">{formatDateTime(row.timestamp || row.createdAt)}</span>,
    },
    {
      key: 'user',
      header: 'Utilisateur',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
            {row.user?.name?.charAt(0) || row.user?.email?.charAt(0) || 'U'}
          </div>
          <span className="text-sm">{row.user?.name || row.user?.email || 'Système'}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Catégorie',
      render: (row) => {
        const colors = { billing: 'info', security: 'warning', client: 'primary', config: 'default', error: 'danger' };
        return <Badge variant={colors[row.category] || 'default'}>{row.category || row.action}</Badge>;
      },
    },
    {
      key: 'description',
      header: 'Action',
      render: (row) => <span className="text-sm font-medium">{row.description || row.action}</span>,
    },
    {
      key: 'details',
      header: 'Détails',
      render: (row) => (
        <div className="text-xs text-slate-500 max-w-xs">
          {row.details?.before && <div className="text-red-500 line-through">{JSON.stringify(row.details.before)}</div>}
          {row.details?.after && <div className="text-green-600">{JSON.stringify(row.details.after)}</div>}
          {!row.details && <span className="italic text-slate-400">N/A</span>}
        </div>
      ),
    },
    {
      key: 'ip',
      header: 'Adresse IP',
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.ip || row.ipAddress || '-'}</span>,
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
            <option value="billing">Facturation</option>
            <option value="security">Sécurité</option>
            <option value="client">Client</option>
          </Select>
          <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="w-48">
            <option value="1">Aujourd'hui</option>
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
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
