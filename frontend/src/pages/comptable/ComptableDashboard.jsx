import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Card, Badge, Loading, Button, Select, Input, DataTable, Modal } from '../../components/ui';
import { invoiceService, expenseService, cashTransactionService, clientService, productService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiCheckCircle, FiAlertCircle, FiShoppingCart, FiMinusCircle, FiCreditCard, FiPlus, FiFileText, FiDownload, FiArrowUpCircle, FiArrowDownCircle, FiEdit2, FiTrash2 } from 'react-icons/fi';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend !== undefined && trend !== null && (
            <span className={`text-xs font-bold flex items-center gap-0.5 mt-2 ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {trend > 0 ? <FiTrendingUp className="text-sm" /> : trend < 0 ? <FiTrendingDown className="text-sm" /> : <FiTrendingUp className="text-sm" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {Icon && <Icon />}
        </div>
      </div>
    </Card>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
      active
        ? 'bg-primary text-white shadow-md'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {Icon && <Icon className="text-lg" />}
    {label}
  </button>
);

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
      window.dispatchEvent(new Event('cashDataRefresh'));
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
          <Select label="Type" name="type" value={formData.type} onChange={handleChange} required>
            <option value="in">Entrée</option>
            <option value="out">Sortie</option>
          </Select>
          <Input label="Montant" name="amount" type="number" step="0.01" min="0" value={formData.amount} onChange={handleChange} placeholder="0.00" required />
          <Select label="Méthode" name="method" value={formData.method} onChange={handleChange}>
            {methodOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
          <Select label="Catégorie" name="category" value={formData.category} onChange={handleChange}>
            {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
          <Input label="Date" name="date" type="date" value={formData.date} onChange={handleChange} required />
        </div>
        <Input label="Description" name="description" value={formData.description} onChange={handleChange} placeholder="Description de la transaction..." required />
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>{editingTransaction ? 'Modifier' : 'Ajouter'}</Button>
        </div>
      </form>
    </Modal>
  );
};

const ComptableDashboard = () => {
  const { billing } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currency = billing?.currency || 'MAD';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    profit: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);

  const [transactions, setTransactions] = useState([]);
  const [cashSummary, setCashSummary] = useState({ balance: 0, totalIn: 0, totalOut: 0 });
  const [cashFilters, setCashFilters] = useState({ type: 'all', method: 'all', startDate: '', endDate: '' });
  const [cashRefreshKey, setCashRefreshKey] = useState(0);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const isComptable = user?.role === 'comptable';

  const fetchDashboardData = async () => {
    try {
      const [invoicesRes, expensesRes] = await Promise.all([
        invoiceService.getAll({ limit: 5, sort: '-createdAt' }),
        expenseService.getAll({ limit: 5, sort: '-createdAt' }),
      ]);

      const invoices = (invoicesRes.data || invoicesRes).map(inv => ({
        ...inv,
        number: inv.number || inv.invoiceNumber,
        issueDate: inv.issueDate || inv.date,
        totalTTC: inv.totalTTC || inv.total || 0,
      }));
      const expenses = (expensesRes.data || expensesRes);

      const totalRevenue = invoices.filter(inv => inv.status === 'payé' || inv.status === 'paid').reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      setStats({
        monthlyRevenue: totalRevenue,
        monthlyExpenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
        pendingInvoices: invoices.filter(inv => inv.status === 'envoyé' || inv.status === 'sent').length,
        paidInvoices: invoices.filter(inv => inv.status === 'payé' || inv.status === 'paid').length,
      });

      setRecentInvoices(invoices);
      setRecentExpenses(expenses);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCashData = useCallback(async () => {
    try {
      const params = {};
      if (cashFilters.type !== 'all') params.type = cashFilters.type;
      if (cashFilters.method !== 'all') params.method = cashFilters.method;
      if (cashFilters.startDate) params.startDate = cashFilters.startDate;
      if (cashFilters.endDate) params.endDate = cashFilters.endDate;
      params.limit = 100;

      const [transRes, summaryRes] = await Promise.all([
        cashTransactionService.getAll(params),
        cashTransactionService.getSummary({
          startDate: cashFilters.startDate || undefined,
          endDate: cashFilters.endDate || undefined,
        }),
      ]);

      setTransactions(transRes.data || []);
      setCashSummary({
        balance: summaryRes.balance || 0,
        totalIn: summaryRes.totalIn || 0,
        totalOut: summaryRes.totalOut || 0,
      });
    } catch (error) {
      console.error('Error fetching cash data:', error);
    }
  }, [cashFilters, cashRefreshKey]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'caisse') {
      fetchCashData();
    }
  }, [activeTab, fetchCashData]);

  useEffect(() => {
    const handleCashDataRefresh = () => {
      if (activeTab === 'caisse') {
        fetchCashData();
      }
      setCashRefreshKey(prev => prev + 1);
    };

    window.addEventListener('cashDataRefresh', handleCashDataRefresh);
    return () => window.removeEventListener('cashDataRefresh', handleCashDataRefresh);
  }, [activeTab, fetchCashData]);

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Supprimer cette transaction ?')) return;
    try {
      await cashTransactionService.delete(id);
      setCashRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('cashDataRefresh'));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Source', 'Méthode', 'Description', 'Montant'];
    let runningBalance = 0;
    const rows = transactions.map(t => {
      runningBalance += t.type === 'in' ? t.amount : -t.amount;
      return [
        formatDateShort(t.date),
        t.type === 'in' ? 'Entrée' : 'Sortie',
        t.source === 'invoice' ? 'Facture' : t.source === 'expense' ? 'Dépense' : 'Manuel',
        t.method,
        t.description,
        t.amount,
        formatCurrency(runningBalance, currency),
      ];
    });

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
    const labels = { cash: 'Espèces', virement: 'Virement', cheque: 'Chèque', carte: 'Carte', traite: 'Traite', autre: 'Autre' };
    return labels[method] || method;
  };

  const getStatusBadge = (status) => {
    const variants = { paid: 'success', sent: 'warning', overdue: 'danger', draft: 'default' };
    const labels = { paid: 'Payé', sent: 'Envoyé', overdue: 'En retard', draft: 'Brouillon' };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const cashColumns = [
    { key: 'date', header: 'Date', render: (row) => <span className="text-sm">{formatDateShort(row.date)}</span> },
    { key: 'type', header: 'Type', render: (row) => (
      <Badge variant={row.type === 'in' ? 'success' : 'danger'}>
        <span className="flex items-center gap-1">
          {row.type === 'in' ? <FiArrowUpCircle className="text-xs" /> : <FiArrowDownCircle className="text-xs" />}
          {row.type === 'in' ? 'Entrée' : 'Sortie'}
        </span>
      </Badge>
    )},
    { key: 'source', header: 'Source', render: (row) => (
      <Badge variant={row.source === 'manual' ? 'default' : row.source === 'invoice' ? 'info' : 'warning'}>
        {row.source === 'invoice' ? 'Facture' : row.source === 'expense' ? 'Dépense' : row.source === 'refund' ? 'Remboursement' : 'Manuel'}
      </Badge>
    )},
    { key: 'description', header: 'Description', render: (row) => <span className="text-sm max-w-xs truncate">{row.description}</span> },
    { key: 'method', header: 'Méthode', render: (row) => <span className="text-sm">{getMethodLabel(row.method)}</span> },
    { key: 'amount', header: 'Montant', render: (row) => (
      <span className={`font-semibold ${row.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
        {row.type === 'in' ? '+' : '-'}{formatCurrency(row.amount, currency)}
      </span>
    )},
    { key: 'actions', header: '', width: '80px', render: (row) => (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); setEditingTransaction(row); setShowTransactionModal(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Modifier">
          <FiEdit2 className="text-xs" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(row._id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500" title="Supprimer">
          <FiTrash2 className="text-xs" />
        </button>
      </div>
    )},
  ];

  if (loading) {
    return (
      <PageLayout title="Tableau de bord Comptable">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Tableau de bord Comptable">
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-4 overflow-x-auto">
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={FiTrendingUp} label="Tableau de bord" />
          <TabButton active={activeTab === 'factures'} onClick={() => { setActiveTab('factures'); navigate('/invoices'); }} icon={FiFileText} label="Factures" />
          <TabButton active={activeTab === 'depenses'} onClick={() => { setActiveTab('depenses'); navigate('/expenses'); }} icon={FiShoppingCart} label="Dépenses" />
          <TabButton active={activeTab === 'caisse'} onClick={() => setActiveTab('caisse')} icon={FiCreditCard} label="Caisse" />
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="Revenus du mois" value={formatCurrency(stats.monthlyRevenue, currency)} subtitle="Factures payées" icon={FiDollarSign} trend={8.2} color="success" />
              <StatCard title="Dépenses du mois" value={formatCurrency(stats.monthlyExpenses, currency)} subtitle="Total dépenses" icon={FiShoppingCart} trend={-3.1} color="warning" />
              <StatCard title="Bénéfice" value={formatCurrency(stats.profit, currency)} subtitle="Revenus - Dépenses" icon={stats.profit >= 0 ? FiTrendingUp : FiTrendingDown} color={stats.profit >= 0 ? 'success' : 'danger'} />
              <StatCard title="Factures en attente" value={stats.pendingInvoices} subtitle="En attente de paiement" icon={FiAlertCircle} color="danger" />
              <StatCard title="Factures payées" value={stats.paidInvoices} subtitle="Ce mois" icon={FiCheckCircle} color="success" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card title="Factures Récentes" actions={<Link to="/invoices" className="text-sm text-primary hover:underline">Voir tout</Link>}>
                <div className="space-y-4">
                  {recentInvoices.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Aucune facture</p>
                  ) : (
                    recentInvoices.map((invoice) => (
                      <div key={invoice._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-bold">{invoice.number?.slice(-4) || 'FA-000'}</div>
                          <div>
                            <p className="text-sm font-medium">{invoice.clientId?.companyName || invoice.client?.name || 'Client'}</p>
                            <p className="text-xs text-slate-500">{formatDateShort(invoice.issueDate)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(invoice.totalTTC || 0, currency)}</p>
                          {getStatusBadge(invoice.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card title="Dépenses Récentes" actions={<Link to="/expenses" className="text-sm text-primary hover:underline">Voir tout</Link>}>
                <div className="space-y-4">
                  {recentExpenses.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Aucune dépense</p>
                  ) : (
                    recentExpenses.map((expense) => (
                      <div key={expense._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="size-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold"><FiMinusCircle /></div>
                          <div>
                            <p className="text-sm font-medium">{expense.description || 'Dépense'}</p>
                            <p className="text-xs text-slate-500">{formatDateShort(expense.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">-{formatCurrency(expense.amount || 0, currency)}</p>
                          <Badge variant="warning">{expense.category || 'Autre'}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            <Card title="Résumé Financier" actions={<Button variant="ghost" size="sm" onClick={() => setActiveTab('caisse')}><FiCreditCard className="text-xs mr-1" /> Ouvrir la caisse</Button>}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Revenus</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(stats.monthlyRevenue, currency)}</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Dépenses</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">-{formatCurrency(stats.monthlyExpenses, currency)}</p>
                </div>
                <div className={`p-4 rounded-lg ${stats.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <p className={`text-sm font-medium ${stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>Bénéfice</p>
                  <p className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{formatCurrency(stats.profit, currency)}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'caisse' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Solde actuel" value={formatCurrency(cashSummary.balance, currency)} subtitle="Balance de la caisse" icon={FiDollarSign} color="primary" />
              <StatCard title="Total Entrées" value={formatCurrency(cashSummary.totalIn, currency)} subtitle="Rentrées d'argent" icon={FiTrendingUp} color="success" />
              <StatCard title="Total Sorties" value={formatCurrency(cashSummary.totalOut, currency)} subtitle="Dépenses" icon={FiTrendingDown} color="danger" />
              <StatCard title="Flux net" value={formatCurrency(cashSummary.totalIn - cashSummary.totalOut, currency)} subtitle="Entrées - Sorties" icon={cashSummary.totalIn >= cashSummary.totalOut ? FiTrendingUp : FiTrendingDown} color={cashSummary.totalIn >= cashSummary.totalOut ? 'success' : 'danger'} />
            </div>

            <Card className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <Select label="Type" value={cashFilters.type} onChange={(e) => setCashFilters({ ...cashFilters, type: e.target.value })} className="w-36">
                  <option value="all">Tous</option>
                  <option value="in">Entrées</option>
                  <option value="out">Sorties</option>
                </Select>
                <Select label="Méthode" value={cashFilters.method} onChange={(e) => setCashFilters({ ...cashFilters, method: e.target.value })} className="w-36">
                  <option value="all">Toutes</option>
                  <option value="cash">Espèces</option>
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                  <option value="carte">Carte</option>
                  <option value="traite">Traite</option>
                </Select>
                <Input label="Date début" type="date" value={cashFilters.startDate} onChange={(e) => setCashFilters({ ...cashFilters, startDate: e.target.value })} className="w-40" />
                <Input label="Date fin" type="date" value={cashFilters.endDate} onChange={(e) => setCashFilters({ ...cashFilters, endDate: e.target.value })} className="w-40" />
                <Button variant="secondary" onClick={() => setCashFilters({ type: 'all', method: 'all', startDate: '', endDate: '' })}>Réinitialiser</Button>
              </div>
            </Card>

            <Card className="p-0">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-slate-900 dark:text-white">Transactions</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleExportCSV}><FiDownload className="text-xs mr-1" /> CSV</Button>
                  <Button size="sm" onClick={() => { setEditingTransaction(null); setShowTransactionModal(true); }}><FiPlus className="text-xs mr-1" /> Transaction</Button>
                </div>
              </div>
              <DataTable columns={cashColumns} data={transactions} emptyMessage="Aucune transaction trouvée" rowClassName="hover:bg-slate-50 dark:hover:bg-slate-800/50" />
            </Card>
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); }}
        onSuccess={() => setCashRefreshKey(prev => prev + 1)}
        editingTransaction={editingTransaction}
      />
    </PageLayout>
  );
};

export default ComptableDashboard;
