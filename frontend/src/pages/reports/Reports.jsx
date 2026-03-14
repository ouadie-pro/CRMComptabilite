import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Card, Badge, Loading } from '../../components/ui';
import { invoiceService, clientService, expenseService } from '../../services';
import { formatCurrency } from '../../utils/formatters';
import { FiTrendingUp, FiTrendingDown, FiShoppingCart, FiBriefcase } from 'react-icons/fi';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    cashflow: 0,
    activeClients: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [invoicesRes, clientsRes, expensesRes] = await Promise.all([
          invoiceService.getAll(),
          clientService.getAll(),
          expenseService.getAll(),
        ]);

        const allInvoices = invoicesRes.data || invoicesRes;
        const allClients = clientsRes.data || clientsRes;
        const allExpenses = expensesRes.data || expensesRes;

        const totalRevenue = allInvoices.reduce(
          (sum, inv) => sum + (inv.totalTTC || inv.total || 0), 0
        );

        const totalExpenses = allExpenses.reduce(
          (sum, exp) => sum + (exp.amount || 0), 0
        );

        const netProfit = totalRevenue - totalExpenses;

        const paidInvoices = allInvoices.filter(inv => inv.status === 'payé');
        const cashflow = paidInvoices.reduce(
          (sum, inv) => sum + (inv.totalTTC || inv.total || 0), 0
        );

        const activeClients = allClients.filter(
          client => client.status === 'actif'
        ).length;

        setStats({
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: netProfit,
          cashflow: cashflow,
          activeClients: activeClients,
        });

        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = date.toLocaleString('default', { month: 'short' });
          months.push({
            label: monthKey.charAt(0).toUpperCase() + monthKey.slice(1),
            start: new Date(date.getFullYear(), date.getMonth(), 1),
            end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
          });
        }

        const chartData = months.map(month => {
          const monthInvoices = allInvoices.filter(inv => {
            const invDate = new Date(inv.issueDate || inv.date);
            return invDate >= month.start && invDate <= month.end;
          });
          const monthExpenses = allExpenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= month.start && expDate <= month.end;
          });
          return {
            month: month.label,
            revenue: monthInvoices.reduce((sum, inv) => sum + (inv.totalTTC || inv.total || 0), 0),
            expenses: monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
          };
        });

        setMonthlyData(chartData);

        const transactions = [
          ...allInvoices.slice(0, 5).map(inv => ({
            client: inv.client?.name || 'Client',
            type: 'Revenu',
            amount: inv.totalTTC || inv.total || 0,
            status: inv.status === 'payé' ? 'paid' : 'pending',
            rawDate: new Date(inv.issueDate || inv.date),
            date: new Date(inv.issueDate || inv.date).toLocaleDateString('fr-FR'),
          })),
          ...allExpenses.slice(0, 5).map(exp => ({
            client: exp.description || 'Dépense',
            type: 'Dépense',
            amount: -(exp.amount || 0),
            status: 'paid',
            rawDate: new Date(exp.date),
            date: new Date(exp.date).toLocaleDateString('fr-FR'),
          })),
        ].sort((a, b) => b.rawDate - a.rawDate).slice(0, 8);

        setRecentTransactions(transactions);
      } catch (error) {
        console.error('Error fetching reports data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'revenue': return <FiTrendingUp />;
      case 'expense': return <FiShoppingCart />;
      case 'profit': return <FiBriefcase />;
      default: return <FiTrendingDown />;
    }
  };

  const getStats = () => [
    { title: 'Revenu Total', value: stats.revenue, change: null, type: 'revenue' },
    { title: 'Dépenses Totales', value: stats.expenses, change: null, type: 'expense' },
    { title: 'Bénéfice Net', value: stats.profit, change: null, type: 'profit' },
    { title: 'Flux de Trésorerie', value: stats.cashflow, change: null, type: 'cashflow' },
  ];

  if (loading) {
    return (
      <PageLayout title="Rapports">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Rapports">
      <div className="space-y-8">
        <p className="text-slate-500">Aperçu de la performance financière actuelle</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getStats().map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
                <span className={`p-2 rounded-lg ${stat.type === 'revenue' ? 'bg-emerald-50 text-emerald-600' : stat.type === 'expense' ? 'bg-slate-100 text-slate-600' : stat.type === 'profit' ? 'bg-primary/10 text-primary' : 'bg-rose-50 text-rose-600'}`}>
                  {getIcon(stat.type)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{formatCurrency(stat.value)}</h3>
              </div>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <Card title="Revenus vs Dépenses">
          {monthlyData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Aucune donnée disponible</p>
          ) : (
            <>
              <div className="h-80 flex items-end justify-between gap-4 px-4">
                {(() => {
                  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.expenses)), 1);
                  return monthlyData.map((data, i) => {
                    const revenueHeight = maxValue > 0 ? (data.revenue / maxValue) * 100 : 0;
                    const expenseHeight = maxValue > 0 ? (data.expenses / maxValue) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3">
                        <div className="w-full flex justify-center items-end gap-1 h-64">
                          <div className="w-8 bg-primary rounded-t-sm transition-all duration-300" style={{ height: `${Math.max(revenueHeight, 2)}%` }}></div>
                          <div className="w-8 bg-slate-200 dark:bg-slate-700 rounded-t-sm transition-all duration-300" style={{ height: `${Math.max(expenseHeight, 2)}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{data.month}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex justify-center gap-8 mt-4 text-xs font-medium">
                <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-primary"></span> Revenus</div>
                <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-slate-400"></span> Dépenses</div>
              </div>
            </>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card title="Dernières Transactions">
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Aucune transaction</p>
            ) : (
              recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                      {tx.type === 'Revenu' ? <FiTrendingUp className="text-sm text-slate-600" /> : <FiShoppingCart className="text-sm text-slate-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.client}</p>
                      <p className="text-xs text-slate-500">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                    </p>
                    <Badge variant={tx.status === 'paid' ? 'success' : 'warning'}>{tx.status === 'paid' ? 'Payé' : 'En attente'}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Reports;
