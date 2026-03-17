import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Card, Badge, Loading } from '../../components/ui';
import { invoiceService, expenseService } from '../../services';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiCheckCircle, FiAlertCircle, FiShoppingCart, FiMinusCircle } from 'react-icons/fi';

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

const ComptableDashboard = () => {
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    profit: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        const totalRevenue = invoices
          .filter(inv => inv.status === 'payé' || inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);

        const totalExpenses = expenses
          .reduce((sum, exp) => sum + (exp.amount || 0), 0);

        const pendingCount = invoices.filter(inv => inv.status === 'envoyé' || inv.status === 'sent').length;
        const paidCount = invoices.filter(inv => inv.status === 'payé' || inv.status === 'paid').length;

        setStats({
          monthlyRevenue: totalRevenue,
          monthlyExpenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
          pendingInvoices: pendingCount,
          paidInvoices: paidCount,
        });

        setRecentInvoices(invoices);
        setRecentExpenses(expenses);
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

  const getStatusBadge = (status) => {
    const variants = {
      paid: 'success',
      sent: 'warning',
      overdue: 'danger',
      draft: 'default',
    };
    const labels = {
      paid: 'Payé',
      sent: 'Envoyé',
      overdue: 'En retard',
      draft: 'Brouillon',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  return (
    <PageLayout title="Tableau de bord">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Revenus du mois"
            value={formatCurrency(stats.monthlyRevenue)}
            subtitle="Factures payées"
            icon={FiDollarSign}
            trend={8.2}
            color="success"
          />
          <StatCard
            title="Dépenses du mois"
            value={formatCurrency(stats.monthlyExpenses)}
            subtitle="Total dépenses"
            icon={FiShoppingCart}
            trend={-3.1}
            color="warning"
          />
          <StatCard
            title="Bénéfice"
            value={formatCurrency(stats.profit)}
            subtitle="Revenus - Dépenses"
            icon={stats.profit >= 0 ? FiTrendingUp : FiTrendingDown}
            color={stats.profit >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            title="Factures en attente"
            value={stats.pendingInvoices}
            subtitle="En attente de paiement"
            icon={FiAlertCircle}
            color="danger"
          />
          <StatCard
            title="Factures payées"
            value={stats.paidInvoices}
            subtitle="Ce mois"
            icon={FiCheckCircle}
            color="success"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                        {invoice.invoiceNumber?.slice(-4) || 'FA-000'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invoice.clientId?.companyName || invoice.client?.name || 'Client'}</p>
                        <p className="text-xs text-slate-500">{formatDateShort(invoice.issueDate)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(invoice.totalTTC || 0)}</p>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Dépenses Récentes" actions={
            <Link to="/expenses" className="text-sm text-primary hover:underline">Voir tout</Link>
          }>
            <div className="space-y-4">
              {recentExpenses.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Aucune dépense</p>
              ) : (
                recentExpenses.map((expense) => (
                  <div key={expense._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold">
                        <FiMinusCircle />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{expense.description || 'Dépense'}</p>
                        <p className="text-xs text-slate-500">{formatDateShort(expense.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">-{formatCurrency(expense.amount || 0)}</p>
                      <Badge variant="warning">{expense.category || 'Autre'}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card title="Résumé Financier">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Revenus</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(stats.monthlyRevenue)}</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Dépenses</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">-{formatCurrency(stats.monthlyExpenses)}</p>
            </div>
            <div className={`p-4 rounded-lg ${stats.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className={`text-sm font-medium ${stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>Bénéfice</p>
              <p className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {formatCurrency(stats.profit)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ComptableDashboard;
