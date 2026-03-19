import { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../../components/layout';
import { Card, Button, Select, Input, DataTable, Modal, Badge, Loading } from '../../components/ui';
import { cashTransactionService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiPlus, FiDownload, FiTrendingUp, FiTrendingDown, FiDollarSign, FiArrowUpCircle, FiArrowDownCircle, FiEdit2, FiX } from 'react-icons/fi';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
          <p className={`text-xl font-bold ${color === 'success' ? 'text-emerald-600' : color === 'danger' ? 'text-red-600' : ''}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          {Icon && <Icon className="text-xl" />}
        </div>
      </div>
    </Card>
  );
};

const TransactionModal = ({ isOpen, onClose, onSuccess, editingTransaction }) => {
  const [formData, setFormData] = useState({
    type: 'in',
    amount: '',
    method: 'cash',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'other',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        method: editingTransaction.method,
        date: new Date(editingTransaction.date).toISOString().split('T')[0],
        description: editingTransaction.description,
        category: editingTransaction.category,
      });
    } else {
      setFormData({
        type: 'in',
        amount: '',
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'other',
      });
    }
  }, [editingTransaction, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }
    if (!formData.description.trim()) {
      alert('Veuillez entrer une description');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        source: 'manual',
      };

      if (editingTransaction) {
        await cashTransactionService.update(editingTransaction._id, data);
      } else {
        await cashTransactionService.create(data);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const methodOptions = [
    { value: 'cash', label: 'Espèces' },
    { value: 'virement', label: 'Virement' },
    { value: 'cheque', label: 'Chèque' },
    { value: 'carte', label: 'Carte bancaire' },
    { value: 'traite', label: 'Traite' },
    { value: 'autre', label: 'Autre' },
  ];

  const categoryOptions = [
    { value: 'sale', label: 'Vente' },
    { value: 'service', label: 'Service' },
    { value: 'deposit', label: 'Dépôt' },
    { value: 'withdrawal', label: 'Retrait' },
    { value: 'supply', label: 'Fourniture' },
    { value: 'salary', label: 'Salaire' },
    { value: 'rent', label: 'Loyer' },
    { value: 'utility', label: 'Charge' },
    { value: 'transport', label: 'Transport' },
    { value: 'other', label: 'Autre' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="in">Entrée</option>
            <option value="out">Sortie</option>
          </Select>
          <Input
            label="Montant"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            required
          />
          <Select
            label="Méthode"
            name="method"
            value={formData.method}
            onChange={handleChange}
          >
            {methodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
          <Select
            label="Catégorie"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
          <Input
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>
        <Input
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Description de la transaction..."
          required
        />
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>
            {editingTransaction ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const Caisse = () => {
  const { billing } = useSettings();
  const currency = billing?.currency || 'MAD';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ 
    balance: 0, 
    totalIn: 0, 
    totalOut: 0,
    orphanedPayments: { count: 0, total: 0 },
    orphanedExpenses: { count: 0, total: 0 }
  });

  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [filters, setFilters] = useState({
    type: 'all',
    method: 'all',
    startDate: '',
    endDate: '',
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.method !== 'all') params.method = filters.method;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      params.limit = 100;

      const [transRes, summaryRes] = await Promise.all([
        cashTransactionService.getAll(params),
        cashTransactionService.getSummary({
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        }),
      ]);

      setTransactions(transRes.data || []);
      setSummary({
        balance: summaryRes.balance || 0,
        totalIn: summaryRes.totalIn || 0,
        totalOut: summaryRes.totalOut || 0,
        orphanedPayments: summaryRes.orphanedPayments || { count: 0, total: 0 },
        orphanedExpenses: summaryRes.orphanedExpenses || { count: 0, total: 0 },
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleCashDataRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('cashDataRefresh', handleCashDataRefresh);
    return () => window.removeEventListener('cashDataRefresh', handleCashDataRefresh);
  }, []);

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setShowModal(true);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Supprimer cette transaction ?')) return;
    try {
      await cashTransactionService.delete(id);
      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('cashDataRefresh'));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Méthode', 'Catégorie', 'Description', 'Montant'];
    const rows = transactions.map(t => [
      formatDateShort(t.date),
      t.type === 'in' ? 'Entrée' : 'Sortie',
      t.method,
      t.category,
      t.description,
      t.amount,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `caisse-${formatDateShort(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMethodLabel = (method) => {
    const labels = {
      cash: 'Espèces',
      virement: 'Virement',
      cheque: 'Chèque',
      carte: 'Carte',
      traite: 'Traite',
      autre: 'Autre',
    };
    return labels[method] || method;
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="text-sm">{formatDateShort(row.date)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant={row.type === 'in' ? 'success' : 'danger'}>
          <span className="flex items-center gap-1">
            {row.type === 'in' ? <FiArrowUpCircle className="text-xs" /> : <FiArrowDownCircle className="text-xs" />}
            {row.type === 'in' ? 'Entrée' : 'Sortie'}
          </span>
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row) => (
        <Badge variant={row.source === 'manual' ? 'default' : row.source === 'invoice' ? 'info' : 'warning'}>
          {row.source === 'invoice' ? 'Facture' : row.source === 'expense' ? 'Dépense' : row.source === 'refund' ? 'Remboursement' : 'Manuel'}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => <span className="text-sm max-w-xs truncate">{row.description}</span>,
    },
    {
      key: 'method',
      header: 'Méthode',
      render: (row) => <span className="text-sm">{getMethodLabel(row.method)}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      render: (row) => (
        <span className={`font-semibold ${row.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
          {row.type === 'in' ? '+' : '-'}{formatCurrency(row.amount, currency)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); handleEditTransaction(row); }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            title="Modifier"
          >
            <FiEdit2 className="text-xs" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(row._id); }}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"
            title="Supprimer"
          >
            <FiX className="text-xs" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Caisse"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCSV}>
            <FiDownload className="text-sm" />
            Export CSV
          </Button>
          <Button onClick={handleAddTransaction}>
            <FiPlus className="text-sm" />
            Transaction
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Solde Caisse"
            value={formatCurrency(summary.balance, currency)}
            subtitle="Espèces en main"
            icon={FiDollarSign}
            color="primary"
          />
          <StatCard
            title="Revenus Reçus"
            value={formatCurrency(summary.totalIn, currency)}
            subtitle={`${summary.orphanedPayments.count > 0 ? `${summary.orphanedPayments.count} paiements non synchronisés` : 'Tous synchronisés'}`}
            icon={FiTrendingUp}
            color={summary.orphanedPayments.count > 0 ? 'warning' : 'success'}
          />
          <StatCard
            title="Dépenses Payées"
            value={formatCurrency(summary.totalOut, currency)}
            subtitle={`${summary.orphanedExpenses.count > 0 ? `${summary.orphanedExpenses.count} dépenses non synchronisées` : 'Toutes synchronisées'}`}
            icon={FiTrendingDown}
            color={summary.orphanedExpenses.count > 0 ? 'warning' : 'danger'}
          />
          <StatCard
            title="Flux Net"
            value={formatCurrency(summary.totalIn - summary.totalOut, currency)}
            subtitle="Revenus - Dépenses"
            icon={summary.totalIn >= summary.totalOut ? FiTrendingUp : FiTrendingDown}
            color={summary.totalIn >= summary.totalOut ? 'success' : 'danger'}
          />
          <StatCard
            title="Paiements Manquants"
            value={formatCurrency(summary.orphanedPayments.total, currency)}
            subtitle={`${summary.orphanedPayments.count} paiements non liés`}
            icon={FiTrendingUp}
            color={summary.orphanedPayments.count > 0 ? 'warning' : 'primary'}
          />
          <StatCard
            title="Dépenses Manquantes"
            value={formatCurrency(summary.orphanedExpenses.total, currency)}
            subtitle={`${summary.orphanedExpenses.count} dépenses non liées`}
            icon={FiTrendingDown}
            color={summary.orphanedExpenses.count > 0 ? 'warning' : 'primary'}
          />
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <Select
              label="Type"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-36"
            >
              <option value="all">Tous</option>
              <option value="in">Entrées</option>
              <option value="out">Sorties</option>
            </Select>
            <Select
              label="Méthode"
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              className="w-36"
            >
              <option value="all">Toutes</option>
              <option value="cash">Espèces</option>
              <option value="virement">Virement</option>
              <option value="cheque">Chèque</option>
              <option value="carte">Carte</option>
              <option value="traite">Traite</option>
            </Select>
            <Input
              label="Date début"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-40"
            />
            <Input
              label="Date fin"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-40"
            />
            <Button
              variant="secondary"
              onClick={() => setFilters({ type: 'all', method: 'all', startDate: '', endDate: '' })}
            >
              Réinitialiser
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loading size="lg" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={transactions}
            emptyMessage="Aucune transaction trouvée"
            onRowClick={handleEditTransaction}
            rowClassName="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
          />
        )}
      </div>

      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        editingTransaction={editingTransaction}
      />
    </PageLayout>
  );
};

export default Caisse;
