import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Card, Button, Loading, Badge } from '../../components/ui';
import { invoiceService, clientService, expenseService, cashTransactionService, budgetService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiTrendingUp, FiTrendingDown, FiShoppingCart, FiBriefcase, FiDownload, FiCalendar, FiFilter, FiFileText, FiTarget } from 'react-icons/fi';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import html2pdf from 'html2pdf.js';

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  gray: '#6b7280'
};

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

const Reports = () => {
  const { billing, getSafeCurrency } = useSettings();
  const currency = getSafeCurrency(billing?.currency);
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
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [cashFlowData, setCashFlowData] = useState([]);
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  
  const getDefaultDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0].slice(0, 7),
      end: lastDay.toISOString().split('T')[0].slice(0, 7)
    };
  };
  
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [exporting, setExporting] = useState(false);
  const [agingData, setAgingData] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const reportRef = useRef(null);

  const fetchReportsData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const [invoicesRes, clientsRes, expensesRes, chartRes] = await Promise.all([
        invoiceService.getAll(params),
        clientService.getAll(),
        expenseService.getAll(params),
        cashTransactionService.getChartData({ period: 'monthly', months: 6 })
      ]);

      let allInvoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes.data || []);
      let allClients = Array.isArray(clientsRes) ? clientsRes : (clientsRes.data || []);
      let allExpenses = Array.isArray(expensesRes) ? expensesRes : (expensesRes.data || []);


      if (dateRange.start || dateRange.end) {
        const startDate = dateRange.start ? new Date(dateRange.start) : new Date(0);
        const endDate = dateRange.end ? new Date(dateRange.end) : new Date();

        allInvoices = allInvoices.filter(inv => {
          const invDate = new Date(inv.issueDate || inv.date);
          return invDate >= startDate && invDate <= endDate;
        });

        allExpenses = allExpenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= startDate && expDate <= endDate;
        });
      }

      allInvoices = allInvoices.map(inv => ({
        ...inv,
        number: inv.number || inv.invoiceNumber,
        issueDate: inv.issueDate || inv.date,
        totalTTC: inv.totalTTC || inv.total || 0,
      }));

      let filteredInvoices = allInvoices;
      if (activeFilter === 'income') {
        filteredInvoices = allInvoices.filter(inv => inv.status === 'payé');
      } else if (activeFilter === 'expense') {
        filteredInvoices = [];
      }

      const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.totalTTC || inv.total || 0), 0);
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const cashflow = filteredInvoices.filter(inv => inv.status === 'payé')
        .reduce((sum, inv) => sum + (inv.totalTTC || inv.total || 0), 0);
      const activeClients = allClients.filter(client => client.status === 'actif').length;

      setStats({
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: netProfit,
        cashflow: cashflow,
        activeClients: activeClients,
      });

      const clientRevenue = {};
      allInvoices.filter(inv => inv.status === 'payé' || inv.status === 'paid').forEach(inv => {
        const clientId = inv.clientId?._id || inv.clientId;
        const clientName = inv.clientId?.companyName || 'Client';
        if (!clientRevenue[clientId]) {
          clientRevenue[clientId] = { name: clientName, total: 0 };
        }
        clientRevenue[clientId].total += inv.totalTTC || inv.total || 0;
      });
      const topClientsList = Object.entries(clientRevenue)
        .map(([id, data]) => ({ id, name: data.name, revenue: data.total }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopClients(topClientsList);

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
        const revenue = monthInvoices.reduce((sum, inv) => sum + (inv.totalTTC || inv.total || 0), 0);
        const expenses = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        return {
          month: month.label,
          revenue,
          expenses,
          profit: revenue - expenses
        };
      });

      setMonthlyData(chartData);

      const categoryMap = {};
      allExpenses.forEach(exp => {
        const cat = exp.category || 'autre';
        if (!categoryMap[cat]) categoryMap[cat] = 0;
        categoryMap[cat] += exp.amount || 0;
      });

      const categories = Object.entries(categoryMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value * 100) / 100
      }));
      setExpenseCategories(categories);

      const cashFlowMonths = months.map(month => {
        const monthInvoices = allInvoices.filter(inv => {
          const invDate = new Date(inv.issueDate || inv.date);
          return invDate >= month.start && invDate <= month.end;
        });
        const monthExpenses = allExpenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= month.start && expDate <= month.end;
        });
        const income = monthInvoices
          .filter(inv => inv.status === 'payé')
          .reduce((sum, inv) => sum + (inv.totalTTC || inv.total || 0), 0);
        const expenses = monthExpenses
          .filter(exp => exp.status === 'approved')
          .reduce((sum, exp) => sum + (exp.amount || 0), 0);
        return {
          month: month.label,
          income,
          expenses,
          balance: income - expenses
        };
      });
      setCashFlowData(cashFlowMonths);

      const transactions = [
        ...filteredInvoices.slice(0, 5).map(inv => ({
          client: inv.clientId?.companyName || inv.client?.name || 'Client',
          type: 'Revenu',
          amount: inv.totalTTC || 0,
          status: inv.status === 'payé' || inv.status === 'paid' ? 'paid' : 'pending',
          rawDate: new Date(inv.issueDate || inv.date),
          date: formatDateShort(inv.issueDate || inv.date),
        })),
        ...allExpenses.slice(0, 5).map(exp => ({
          client: exp.description || 'Dépense',
          type: 'Dépense',
          amount: -(exp.amount || 0),
          status: 'paid',
          rawDate: new Date(exp.date),
          date: formatDateShort(exp.date),
        })),
      ].sort((a, b) => b.rawDate - a.rawDate).slice(0, 8);

      setRecentTransactions(transactions);

      const overdueInvoices = allInvoices.filter(inv => 
        inv.status === 'envoyé' || inv.status === 'en_retard'
      ).map(inv => {
        const dueDate = new Date(inv.dueDate || inv.issueDate);
        const today = new Date();
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        let agingBucket = '0-30 jours';
        if (daysOverdue > 90) agingBucket = '90+ jours';
        else if (daysOverdue > 60) agingBucket = '61-90 jours';
        else if (daysOverdue > 30) agingBucket = '31-60 jours';
        else if (daysOverdue > 0) agingBucket = '1-30 jours';
        
        return {
          ...inv,
          daysOverdue: Math.max(0, daysOverdue),
          agingBucket,
        };
      });
      
      const agingBuckets = {
        '0-30 jours': [],
        '31-60 jours': [],
        '61-90 jours': [],
        '90+ jours': [],
      };
      overdueInvoices.forEach(inv => {
        if (agingBuckets[inv.agingBucket]) {
          agingBuckets[inv.agingBucket].push(inv);
        }
      });
      
      setAgingData(Object.entries(agingBuckets).map(([bucket, invoices]) => ({
        bucket,
        count: invoices.length,
        total: invoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0),
      })));

      const budgetRes = await budgetService.getSummary({ year: budgetYear });
      setBudgetData(budgetRes);
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, dateRange.start, dateRange.end, budgetYear]);

  useEffect(() => {
    fetchReportsData();
  }, [location.pathname, refreshKey, fetchReportsData]);

  const refreshReports = () => {
    setRefreshKey(prev => prev + 1);
  };

  window.refreshReports = refreshReports;

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      
      const formatNum = (num) => {
        if (num === null || num === undefined || isNaN(num)) return 0;
        return Math.round(num * 100) / 100;
      };
      
      const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('fr-FR');
      };
      
      const workbook = XLSX.utils.book_new();
      
      const summaryData = [
        [{ v: 'Rapport Financier', t: 's' }],
        [{ v: '', t: 's' }],
        [{ v: 'Période', t: 's' }, { v: `${dateRange.start} à ${dateRange.end}`, t: 's' }],
        [{ v: '', t: 's' }],
        [{ v: 'Revenu Total', t: 's' }, { v: formatNum(stats.revenue), t: 'n' }],
        [{ v: 'Dépenses Totales', t: 's' }, { v: formatNum(stats.expenses), t: 'n' }],
        [{ v: 'Bénéfice Net', t: 's' }, { v: formatNum(stats.profit), t: 'n' }],
        [{ v: 'Flux de Trésorerie', t: 's' }, { v: formatNum(stats.cashflow), t: 'n' }],
        [{ v: 'Clients Actifs', t: 's' }, { v: stats.activeClients || 0, t: 'n' }],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
      summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');
      
      const invoicesRes = await invoiceService.getAll({
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end })
      });
      const invoices = invoicesRes.data || invoicesRes || [];
      
      const transactionsHeader = [
        { v: 'N° Facture', t: 's' },
        { v: 'Client', t: 's' },
        { v: 'Date', t: 's' },
        { v: 'Échéance', t: 's' },
        { v: 'Montant (MAD)', t: 's' },
        { v: 'Statut', t: 's' }
      ];
      
      const transactionsRows = invoices.map(inv => [
        { v: inv.number || '', t: 's' },
        { v: inv.clientId?.companyName || '', t: 's' },
        { v: formatDate(inv.issueDate), t: 's' },
        { v: formatDate(inv.dueDate), t: 's' },
        { v: formatNum(inv.totalTTC), t: 'n' },
        { v: inv.status === 'payé' ? 'Payé' : inv.status === 'envoyé' ? 'Envoyé' : inv.status === 'en_retard' ? 'En retard' : 'Brouillon', t: 's' }
      ]);
      
      const transactionsData = [transactionsHeader, ...transactionsRows];
      const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);
      transactionsSheet['!cols'] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 }
      ];
      transactionsSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
      transactionsSheet['!freeze'] = 'A2';
      XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');
      
      const monthlyHeader = [
        { v: 'Mois', t: 's' },
        { v: 'Revenus (MAD)', t: 's' },
        { v: 'Dépenses (MAD)', t: 's' },
        { v: 'Bénéfice (MAD)', t: 's' }
      ];
      
      const monthlyRows = monthlyData.map(m => [
        { v: m.month, t: 's' },
        { v: formatNum(m.revenue), t: 'n' },
        { v: formatNum(m.expenses), t: 'n' },
        { v: formatNum(m.profit), t: 'n' }
      ]);
      
      const monthlySheetData = [monthlyHeader, ...monthlyRows];
      const monthlySheet = XLSX.utils.aoa_to_sheet(monthlySheetData);
      monthlySheet['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      monthlySheet['!freeze'] = 'A2';
      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Données Mensuelles');
      
      XLSX.writeFile(workbook, `rapport-financier-${formatDateShort(new Date())}.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Erreur lors de l\'export Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    let styleOverride = null;
    try {
      const element = reportRef.current;
      if (!element) return;

      styleOverride = document.createElement('style');
      styleOverride.id = 'pdf-export-override';
      styleOverride.textContent = `
        [style*="oklch"] { color: #333 !important; background-color: #fff !important; }
        [fill*="oklch"] { fill: #6b7280 !important; }
        [stroke*="oklch"] { stroke: #6b7280 !important; }
        [stop-color*="oklch"] { stop-color: #6b7280 !important; }
        * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
      `;
      document.head.appendChild(styleOverride);

      const replaceOklch = (str) => str.replace(/oklch\([^)]+\)/g, '#6b7280');

      const opt = {
        margin: 10,
        filename: `rapport-financier-${formatDateShort(new Date())}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        onclone: (clonedDoc) => {
          const overrideStyle = clonedDoc.createElement('style');
          overrideStyle.textContent = `
            [style*="oklch"] { color: #333 !important; background-color: #fff !important; }
            [fill*="oklch"] { fill: #6b7280 !important; }
            [stroke*="oklch"] { stroke: #6b7280 !important; }
            [stop-color*="oklch"] { stop-color: #6b7280 !important; }
          `;
          clonedDoc.head.appendChild(overrideStyle);

          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            const styleAttr = el.getAttribute('style') || '';
            if (styleAttr.includes('oklch')) {
              el.setAttribute('style', replaceOklch(styleAttr));
            }
            if (el.hasAttribute('fill') && el.getAttribute('fill').includes('oklch')) {
              el.setAttribute('fill', '#6b7280');
            }
            if (el.hasAttribute('stroke') && el.getAttribute('stroke').includes('oklch')) {
              el.setAttribute('stroke', '#6b7280');
            }
            if (el.hasAttribute('stop-color') && el.getAttribute('stop-color').includes('oklch')) {
              el.setAttribute('stop-color', '#6b7280');
            }
          });

          clonedDoc.querySelectorAll('style').forEach(style => {
            if (style.textContent && style.textContent.includes('oklch')) {
              style.textContent = replaceOklch(style.textContent);
            }
          });

          clonedDoc.querySelectorAll('svg').forEach(svg => {
            if (svg.innerHTML.includes('oklch')) {
              svg.innerHTML = replaceOklch(svg.innerHTML);
            }
          });

          const allSVGElements = clonedDoc.querySelectorAll('svg *');
          allSVGElements.forEach(el => {
            ['fill', 'stroke', 'stop-color', 'color'].forEach(attr => {
              if (el.hasAttribute(attr)) {
                const val = el.getAttribute(attr);
                if (val && val.includes('oklch')) {
                  el.setAttribute(attr, '#6b7280');
                }
              }
            });
          });
        }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
      if (styleOverride && styleOverride.parentNode) {
        styleOverride.parentNode.removeChild(styleOverride);
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'revenue': return <FiTrendingUp />;
      case 'expense': return <FiShoppingCart />;
      case 'profit': return <FiBriefcase />;
      default: return <FiTrendingDown />;
    }
  };

  const getStatCards = () => [
    { title: 'Revenu Total', value: stats.revenue, change: null, type: 'revenue', filter: 'income' },
    { title: 'Dépenses Totales', value: stats.expenses, change: null, type: 'expense', filter: 'expense' },
    { title: 'Bénéfice Net', value: stats.profit, change: null, type: 'profit', filter: 'all' },
    { title: 'Flux de Trésorerie', value: stats.cashflow, change: null, type: 'cashflow', filter: 'all' },
    { title: 'Top Client', value: topClients[0]?.name || '-', subtitle: topClients[0] ? formatCurrency(topClients[0].revenue, currency) : '', type: 'client', filter: 'all' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value || 0, currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-700 dark:text-slate-300">{payload[0].name}</p>
          <p className="text-sm text-primary">
            {formatCurrency(payload[0].value || 0, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

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
      <div ref={reportRef} className="space-y-8">
        <div className="flex items-center justify-between">
          <p className="text-slate-500">Aperçu de la performance financière actuelle</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-slate-400" />
              <input
                type="month"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800"
              />
              <span className="text-slate-500">à</span>
              <input
                type="month"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800"
              />
            </div>
            <Button variant="secondary" onClick={() => {
              setDateRange({ start: '', end: '' });
              setActiveFilter('all');
            }}>
              <FiFilter className="text-sm" />
              Réinitialiser
            </Button>
            <Button variant="secondary" onClick={handleExportExcel} loading={exporting}>
              <FiFileText className="text-sm" />
              Export Excel
            </Button>
            <Button onClick={handleExportPDF} loading={exporting}>
              <FiDownload className="text-sm" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getStatCards().map((stat, index) => (
            <Card 
              key={index} 
              className={`p-6 cursor-pointer transition-all duration-200 ${
                activeFilter === stat.filter ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              onClick={() => stat.type === 'client' ? null : setActiveFilter(stat.filter === activeFilter ? 'all' : stat.filter)}
            >
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
                <span className={`p-2 rounded-lg ${
                  stat.type === 'revenue' ? 'bg-emerald-50 text-emerald-600' : 
                  stat.type === 'expense' ? 'bg-slate-100 text-slate-600' : 
                  stat.type === 'profit' ? 'bg-primary/10 text-primary' : 
                  stat.type === 'client' ? 'bg-blue-50 text-blue-600' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  {getIcon(stat.type)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className={`text-2xl font-bold ${stat.type === 'client' ? 'text-lg' : ''}`}>
                  {stat.type === 'client' ? stat.value : formatCurrency(stat.value, currency)}
                </h3>
                {stat.subtitle && <span className="text-sm text-emerald-600">{stat.subtitle}</span>}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Revenus vs Dépenses vs Bénéfice">
            {monthlyData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aucune donnée disponible</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenus" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Dépenses" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" name="Bénéfice Net" stroke={CHART_COLORS.primary} strokeWidth={3} dot={{ fill: CHART_COLORS.primary, strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Répartition des Dépenses">
            {expenseCategories.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aucune dépense enregistrée</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <Card title="Flux de Trésorerie (6 derniers mois)">
          {cashFlowData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Aucune donnée disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="income" name="Entrées" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.2} />
                <Area type="monotone" dataKey="expenses" name="Sorties" stroke={CHART_COLORS.danger} fill={CHART_COLORS.danger} fillOpacity={0.2} />
                <Area type="monotone" dataKey="balance" name="Solde" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Échéancier des Factures Impayées">
          {agingData.length === 0 || agingData.every(d => d.count === 0) ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-emerald-600 font-medium">Aucune facture impayée</p>
              <p className="text-sm text-slate-500 mt-1">Toutes les factures sont payées dans les délais</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agingData.map((item, index) => {
                const colors = {
                  '0-30 jours': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                  '31-60 jours': 'bg-amber-100 text-amber-700 border-amber-200',
                  '61-90 jours': 'bg-orange-100 text-orange-700 border-orange-200',
                  '90+ jours': 'bg-red-100 text-red-700 border-red-200',
                };
                return (
                  <div key={index} className={`p-4 rounded-lg border ${colors[item.bucket] || 'bg-slate-100'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{item.bucket}</p>
                        <p className="text-sm opacity-75">{item.count} facture{item.count !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="text-xl font-bold">{formatCurrency(item.total, currency)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {topClients.length > 0 && (
          <Card title="Top Clients par Revenu">
            <div className="space-y-3">
              {topClients.map((client, idx) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-600' : 'bg-slate-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{client.name}</p>
                      <p className="text-xs text-slate-500">Client</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">{formatCurrency(client.revenue, currency)}</p>
                    <p className="text-xs text-slate-500">Revenu total</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card 
          title={
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-2">
                <FiTarget className="text-primary" />
                Suivi des Budgets
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={budgetYear}
                  onChange={(e) => setBudgetYear(parseInt(e.target.value))}
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800"
                >
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" onClick={() => { setEditingBudget(null); setShowBudgetModal(true); }}>
                  + Définir Budget
                </Button>
              </div>
            </div>
          }
        >
          {!budgetData?.categories?.length ? (
            <p className="text-slate-500 text-center py-8">Aucun budget défini pour {budgetYear}</p>
          ) : (
            <div className="space-y-4">
              {budgetData.categories.map((cat, index) => {
                const pct = cat.percentage || 0;
                const isOverBudget = pct >= 100;
                const isWarning = pct >= 80 && pct < 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{cat.category}</span>
                      <div className="text-sm">
                        <span className={isOverBudget ? 'text-red-600 font-semibold' : ''}>
                          {formatCurrency(cat.spent, currency)}
                        </span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-500">{formatCurrency(cat.budgeted, currency)}</span>
                        <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded ${
                          isOverBudget ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          isOverBudget ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {budgetData.totals && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold">Total Budget vs Dépensé</span>
                    <span>
                      <span className="font-semibold">{formatCurrency(budgetData.totals.spent, currency)}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span>{formatCurrency(budgetData.totals.budgeted, currency)}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card title="Dernières Transactions">
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Aucune transaction</p>
            ) : (
              recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                      {tx.type === 'Revenu' ? (
                        <FiTrendingUp className="text-sm text-emerald-600" />
                      ) : (
                        <FiShoppingCart className="text-sm text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.client}</p>
                      <p className="text-xs text-slate-500">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount), currency)}
                    </p>
                    <Badge variant={tx.status === 'paid' ? 'success' : 'warning'}>
                      {tx.status === 'paid' ? 'Payé' : 'En attente'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {showBudgetModal && (
        <BudgetModal 
          onClose={() => setShowBudgetModal(false)} 
          onSave={() => { setShowBudgetModal(false); fetchReportsData(); }}
          editingBudget={editingBudget}
        />
      )}
    </PageLayout>
  );
};

const BudgetModal = ({ onClose, onSave, editingBudget }) => {
  const [category, setCategory] = useState(editingBudget?.category || '');
  const [amount, setAmount] = useState(editingBudget?.amount || '');
  const [saving, setSaving] = useState(false);

  const categories = ['fournitures', 'location', 'salaires', 'utilities', 'marketing', 'transport', 'assurance', 'autre'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !amount) return;
    setSaving(true);
    try {
      await budgetService.set({
        category,
        amount: parseFloat(amount),
        year: new Date().getFullYear()
      });
      onSave();
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Erreur lors de la sauvegarde du budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Définir Budget</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-800"
              required
            >
              <option value="">Sélectionner...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Montant (MAD)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-800"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Reports;
