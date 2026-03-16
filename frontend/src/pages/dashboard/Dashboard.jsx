import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Card, Badge, Loading } from '../../components/ui';
import { clientService, invoiceService, expenseService } from '../../services';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiCheckCircle, FiAlertCircle, FiUsers, FiShoppingCart } from 'react-icons/fi';

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
          {trend && (
            <span className={`text-xs font-bold flex items-center gap-0.5 mt-2 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? <FiTrendingUp className="text-sm" /> : <FiTrendingDown className="text-sm" />}
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

const Dashboard = () => {
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    recoveryRate: 0,
    pendingInvoices: 0,
    totalReceivables: 0,
    activeClients: 0,
    monthlyExpenses: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentClients, setRecentClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const [clientsRes, invoicesRes, expensesRes] = await Promise.all([
          clientService.getAll(),
          invoiceService.getAll(),
          expenseService.getAll(),
        ]);

        const allClients = clientsRes.data || clientsRes;
        const allInvoices = invoicesRes.data || invoicesRes;
        const allExpenses = expensesRes.data || expensesRes;

        const currentMonthInvoices = allInvoices.filter(
          inv => new Date(inv.issueDate) >= startOfMonth
        );
        const monthlyRevenue = currentMonthInvoices.reduce(
          (sum, inv) => sum + (inv.totalTTC || inv.total || 0), 0
        );

        const currentMonthExpenses = allExpenses.filter(
          exp => new Date(exp.date) >= startOfMonth
        );
        const monthlyExpenses = currentMonthExpenses.reduce(
          (sum, exp) => sum + (exp.amount || 0), 0
        );

        const totalInvoices = allInvoices.length;
        const paidInvoices = allInvoices.filter(inv => inv.status === 'payé').length;
        const recoveryRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

        const unpaidInvoices = allInvoices.filter(
          inv => inv.status === 'envoyé' || inv.status === 'en_retard'
        );
        const pendingInvoices = unpaidInvoices.length;
        const totalReceivables = unpaidInvoices.reduce(
          (sum, inv) => sum + (inv.totalTTC || 0), 0
        );

        const activeClients = allClients.filter(
          client => client.status === 'actif'
        ).length;

        setStats({
          monthlyRevenue,
          recoveryRate,
          pendingInvoices,
          totalReceivables,
          activeClients,
          monthlyExpenses,
        });

        setRecentInvoices(allInvoices.slice(0, 5));
        setRecentClients(allClients.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <PageLayout title="Tableau de bord">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Tableau de bord">
      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="C.A. Mensuel"
            value={formatCurrency(stats.monthlyRevenue)}
            subtitle="Ce mois"
            icon={FiDollarSign}
            color="primary"
          />
          <StatCard
            title="Recouvrement"
            value={`${stats.recoveryRate}%`}
            subtitle="Objectif: 95%"
            icon={FiCheckCircle}
            color="success"
          />
          <StatCard
            title="Créances Totales"
            value={formatCurrency(stats.totalReceivables)}
            subtitle={`${stats.pendingInvoices} facture${stats.pendingInvoices !== 1 ? 's' : ''} impayée${stats.pendingInvoices !== 1 ? 's' : ''}`}
            icon={FiAlertCircle}
            color="danger"
          />
          <StatCard
            title="Clients Actifs"
            value={stats.activeClients.toLocaleString()}
            subtitle="Total clients"
            icon={FiUsers}
            color="primary"
          />
          <StatCard
            title="Dépenses"
            value={formatCurrency(stats.monthlyExpenses)}
            subtitle="Dans le budget"
            icon={FiShoppingCart}
            color="warning"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Invoices */}
          <Card title="Factures Récentes" actions={
            <Link to="/invoices" className="text-sm text-primary hover:underline">Voir tout</Link>
          }>
            <div className="space-y-4">
              {recentInvoices.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Aucune facture</p>
              ) : (
                recentInvoices.map((invoice) => (
                  <div key={invoice._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-bold">
                        {invoice.number?.slice(-4) ?? 'FA'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invoice.clientId?.companyName || 'Client'}</p>
                        <p className="text-xs text-slate-500">{formatDateShort(invoice.issueDate)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(invoice.totalTTC || 0)}</p>
                      <Badge variant={invoice.status === 'payé' ? 'success' : invoice.status === 'en_retard' ? 'danger' : 'warning'}>
                        {invoice.status === 'payé' ? 'Payé' : invoice.status === 'en_retard' ? 'En retard' : 'Envoyé'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Clients */}
          <Card title="Clients Récents" actions={
            <Link to="/clients" className="text-sm text-primary hover:underline">Voir tout</Link>
          }>
            <div className="space-y-4">
              {recentClients.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Aucun client</p>
              ) : (
                recentClients.map((client) => (
                  <div key={client._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                        {client.companyName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{client.companyName}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                    <Badge variant={client.status === 'actif' ? 'success' : 'default'}>
                      {client.status === 'actif' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
