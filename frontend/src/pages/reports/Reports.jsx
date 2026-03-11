import { PageLayout } from '../../components/layout';
import { Card, Badge } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import { FiTrendingUp, FiTrendingDown, FiShoppingCart, FiBriefcase } from 'react-icons/fi';

const Reports = () => {
  const stats = [
    { title: 'Revenu Total', value: 45250, change: 12, type: 'revenue' },
    { title: 'Dépenses Totales', value: 32100, change: 5, type: 'expense' },
    { title: 'Bénéfice Net', value: 13150, change: 18, type: 'profit' },
    { title: 'Flux de Trésorerie', value: 8400, change: -2, type: 'cashflow' },
  ];

  const getIcon = (type) => {
    switch (type) {
      case 'revenue': return <FiTrendingUp />;
      case 'expense': return <FiShoppingCart />;
      case 'profit': return <FiBriefcase />;
      default: return <FiTrendingDown />;
    }
  };

  return (
    <PageLayout title="Rapports">
      <div className="space-y-8">
        <p className="text-slate-500">Aperçu de la performance financière actuelle</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
                <span className={`p-2 rounded-lg ${stat.type === 'revenue' ? 'bg-emerald-50 text-emerald-600' : stat.type === 'expense' ? 'bg-slate-100 text-slate-600' : stat.type === 'profit' ? 'bg-primary/10 text-primary' : 'bg-rose-50 text-rose-600'}`}>
                  {getIcon(stat.type)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{formatCurrency(stat.value)}</h3>
                <span className={`text-xs font-semibold ${stat.change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stat.change > 0 ? '+' : ''}{stat.change}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">vs le mois dernier</p>
            </Card>
          ))}
        </div>

        {/* Chart Placeholder */}
        <Card title="Revenus vs Dépenses">
          <div className="h-80 flex items-end justify-between gap-4 px-4">
            {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'].map((month, i) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full flex justify-center items-end gap-1 h-64">
                  <div className="w-8 bg-primary rounded-t-sm" style={{ height: `${60 + i * 8}%` }}></div>
                  <div className="w-8 bg-slate-200 dark:bg-slate-700 rounded-t-sm" style={{ height: `${40 + i * 6}%` }}></div>
                </div>
                <span className="text-xs font-bold text-slate-500">{month}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mt-4 text-xs font-medium">
            <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-primary"></span> Revenus</div>
            <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-slate-400"></span> Dépenses</div>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card title="Dernières Transactions">
          <div className="space-y-4">
            {[
              { client: 'Tech Solutions SARL', type: 'Revenu', amount: 1250, status: 'paid', date: '12 Juin 2024' },
              { client: 'Cloud Hosting Services', type: 'Dépense', amount: -299, status: 'paid', date: '10 Juin 2024' },
              { client: "Cabinet d'Architecture", type: 'Revenu', amount: 4500, status: 'pending', date: '08 Juin 2024' },
            ].map((tx, i) => (
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
            ))}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Reports;
