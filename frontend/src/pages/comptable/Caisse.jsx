import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Card, Button, Select, Input, Modal, Badge, Loading } from '../../components/ui';
import { cashTransactionService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateShort, formatDateFull } from '../../utils/formatters';
import {
  FiPlus, FiDownload, FiTrendingUp, FiTrendingDown, FiDollarSign,
  FiArrowUpCircle, FiArrowDownCircle, FiEdit2, FiX, FiRefreshCw,
  FiExternalLink, FiFileText, FiCreditCard, FiCalendar, FiFilter,
  FiAlertTriangle, FiCheck, FiActivity, FiChevronRight, FiBarChart2
} from 'react-icons/fi';

const EVENT_NAME = 'cashUpdated';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary', onClick }) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <Card
      className={`p-5 transition-all duration-200 ${onClick ? 'hover:shadow-md cursor-pointer hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 font-medium mb-1 truncate">{title}</p>
          <p className={`text-xl font-bold ${color === 'success' ? 'text-emerald-600' : color === 'danger' ? 'text-red-600' : ''}`}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]} ml-3 flex-shrink-0`}>
          {Icon && <Icon className="text-xl" />}
        </div>
      </div>
    </Card>
  );
};

const TransactionDetailModal = ({ transaction, isOpen, onClose, currency }) => {
  const navigate = useNavigate();
  if (!transaction) return null;

  const sourceConfig = {
    invoice: { label: 'Facture', color: 'info', icon: FiFileText },
    expense: { label: 'Dépense', color: 'warning', icon: FiCreditCard },
    manual: { label: 'Manuel', color: 'default', icon: FiEdit2 },
    refund: { label: 'Remboursement', color: 'danger', icon: FiTrendingDown },
  };

  const source = sourceConfig[transaction.source] || sourceConfig.manual;
  const SourceIcon = source.icon;

  const statusConfig = {
    confirmed: { label: 'Confirmé', color: 'success' },
    pending: { label: 'En attente', color: 'warning' },
    rejected: { label: 'Rejeté', color: 'danger' },
  };
  const status = statusConfig[transaction.status] || statusConfig.confirmed;

  const methodLabels = {
    cash: 'Espèces', virement: 'Virement', cheque: 'Chèque',
    carte: 'Carte bancaire', traite: 'Traite', autre: 'Autre'
  };

  const categoryLabels = {
    sale: 'Vente', service: 'Service', deposit: 'Dépôt', withdrawal: 'Retrait',
    supply: 'Fourniture', salary: 'Salaire', rent: 'Loyer', utility: 'Charge',
    transport: 'Transport', refund: 'Remboursement', adjustment: 'Ajustement', other: 'Autre'
  };

  const handleGoToInvoice = () => {
    const id = transaction.linkedInvoiceId?._id || transaction.linkedInvoiceId;
    if (id) navigate(`/invoices?id=${id}`);
  };

  const handleGoToExpense = () => {
    navigate(`/expenses?id=${transaction.linkedExpenseId?._id || transaction.linkedExpenseId}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails de la transaction" size="md">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${transaction.type === 'in' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {transaction.type === 'in' ? <FiArrowUpCircle className="text-2xl" /> : <FiArrowDownCircle className="text-2xl" />}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {transaction.type === 'in' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
              </p>
              <p className="text-sm text-slate-500">
                {transaction.type === 'in' ? 'Entrée' : 'Sortie'} - {methodLabels[transaction.method] || transaction.method}
              </p>
            </div>
          </div>
          <Badge variant={transaction.type === 'in' ? 'success' : 'danger'}>
            {transaction.type === 'in' ? 'Entrée' : 'Sortie'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Source</p>
            <div className="flex items-center gap-2">
              <SourceIcon className="text-sm" />
              <span className="font-medium">{source.label}</span>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Statut</p>
            <Badge variant={status.color}>{status.label}</Badge>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Date</p>
            <p className="font-medium">{formatDateFull(transaction.date)}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Catégorie</p>
            <p className="font-medium">{categoryLabels[transaction.category] || transaction.category}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1">Description</p>
          <p className="font-medium text-slate-900 dark:text-white">{transaction.description}</p>
        </div>

        {transaction.reference && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Référence</p>
            <p className="font-mono text-sm">{transaction.reference}</p>
          </div>
        )}

        {transaction.linkedInvoiceId && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs text-slate-500 mb-2">Facture liée</p>
            <button
              onClick={handleGoToInvoice}
              className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <FiFileText className="text-blue-600" />
                <span className="font-medium">
                  {transaction.linkedInvoiceId?.number || `Facture`}
                </span>
              </div>
              <FiExternalLink className="text-blue-600" />
            </button>
          </div>
        )}

        {transaction.linkedExpenseId && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs text-slate-500 mb-2">Dépense liée</p>
            <button
              onClick={handleGoToExpense}
              className="w-full flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <FiCreditCard className="text-amber-600" />
                <span className="font-medium">
                  {transaction.linkedExpenseId?.description || `Dépense`}
                </span>
              </div>
              <FiExternalLink className="text-amber-600" />
            </button>
          </div>
        )}

        {transaction.userId && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs text-slate-500 mb-1">Créé par</p>
            <p className="font-medium">{transaction.userId.name || transaction.userId.email}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </Modal>
  );
};

const TransactionModal = ({ isOpen, onClose, onSuccess, editingTransaction, defaultType = 'out' }) => {
  const [formData, setFormData] = useState({
    type: defaultType,
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
        type: defaultType,
        amount: '',
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: defaultType === 'in' ? 'deposit' : 'other',
      });
    }
  }, [editingTransaction, isOpen, defaultType]);

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
      alert(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
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

  const categoryOptionsIn = [
    { value: 'deposit', label: 'Dépôt' },
    { value: 'sale', label: 'Vente' },
    { value: 'service', label: 'Service' },
    { value: 'adjustment', label: 'Ajustement' },
    { value: 'refund', label: 'Remboursement' },
    { value: 'other', label: 'Autre' },
  ];

  const categoryOptionsOut = [
    { value: 'withdrawal', label: 'Retrait' },
    { value: 'supply', label: 'Fourniture' },
    { value: 'salary', label: 'Salaire' },
    { value: 'rent', label: 'Loyer' },
    { value: 'utility', label: 'Charge' },
    { value: 'transport', label: 'Transport' },
    { value: 'adjustment', label: 'Ajustement' },
    { value: 'refund', label: 'Remboursement' },
    { value: 'other', label: 'Autre' },
  ];

  const categoryOptions = formData.type === 'in' ? categoryOptionsIn : categoryOptionsOut;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTransaction ? 'Modifier la transaction' : formData.type === 'in' ? 'Nouvelle entrée de caisse' : 'Nouvelle sortie de caisse'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formData.type === 'out' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
            <span>Les entrées sont automatiquement créées depuis les paiements de factures. Utilisez ce formulaire uniquement pour les sorties ou ajustements manuels.</span>
          </div>
        )}

        <div>
          <div className="flex items-center gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
            {formData.type === 'out' && (
              <span title="Les entrees sont creees automatiquement depuis les paiements de factures" className="text-slate-400 cursor-help text-xs">?</span>
            )}
          </div>
          <Select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="in">Entrée</option>
            <option value="out">Sortie</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
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

const ReconcileModal = ({ isOpen, onClose, onSuccess, unlinkedData }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [unlinkedItems, setUnlinkedItems] = useState([]);
  const [processingItem, setProcessingItem] = useState(null);

  useEffect(() => {
    if (isOpen && unlinkedData) {
      const items = [];
      if (unlinkedData.payments?.length > 0) {
        unlinkedData.payments.forEach(p => {
          items.push({ type: 'payment', data: p, amount: p.amount, date: p.paidAt, description: `Paiement facture ${p.invoiceId?.number || ''}` });
        });
      }
      if (unlinkedData.expenses?.length > 0) {
        unlinkedData.expenses.forEach(e => {
          items.push({ type: 'expense', data: e, amount: e.amount, date: e.date, description: e.description });
        });
      }
      setUnlinkedItems(items);
      setCurrentIndex(0);
      setStep(items.length > 0 ? 'review' : 'intro');
    }
  }, [isOpen, unlinkedData]);

  const handleReconcile = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await cashTransactionService.reconcile();
      setResult(res);
      onSuccess();
    } catch (error) {
      console.error('Reconciliation error:', error);
      setResult({ error: true, message: error.response?.data?.message || 'Erreur lors de la réconciliation' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessItem = async (action) => {
    const item = unlinkedItems[currentIndex];
    setProcessingItem(true);
    try {
      if (action === 'sync') {
        if (item.type === 'payment') {
          await cashTransactionService.createFromPayment(item.data._id);
        } else {
          await cashTransactionService.createFromExpense(item.data._id);
        }
      }
      if (currentIndex < unlinkedItems.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setStep('complete');
      }
    } catch (error) {
      console.error('Error processing item:', error);
      alert('Erreur lors du traitement: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingItem(false);
    }
  };

  const handleSkipItem = () => {
    if (currentIndex < unlinkedItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setStep('complete');
    }
  };

  const handleSkipAll = () => {
    setStep('complete');
  };

  const handleClose = () => {
    setResult(null);
    setStep('intro');
    setCurrentIndex(0);
    onClose();
  };

  const currentItem = unlinkedItems[currentIndex];
  const totalUnlinked = unlinkedItems.length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Réconcilier la caisse" size="lg">
      <div className="space-y-4">
        {step === 'intro' && (
          <>
            <p className="text-slate-600 dark:text-slate-300">
              Cette action synchronisera les paiements de factures et les dépenses avec la caisse. Elle créera des transactions pour tous les paiements et dépenses qui ne sont pas encore liés.
            </p>

            {(unlinkedData?.payments?.length > 0 || unlinkedData?.expenses?.length > 0) && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
                  <FiAlertTriangle />
                  <span className="font-medium">Transactions non synchronisées</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Paiements en attente</p>
                    <p className="font-semibold">{unlinkedData.payments?.length || 0}</p>
                    <p className="text-emerald-600">{formatCurrency(unlinkedData.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0, 'MAD')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Dépenses en attente</p>
                    <p className="font-semibold">{unlinkedData.expenses?.length || 0}</p>
                    <p className="text-red-600">-{formatCurrency(unlinkedData.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0, 'MAD')}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <FiAlertTriangle />
                <span className="font-medium">Action irréversible</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Assurez-vous que les données sont correctes avant de procéder.
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="secondary" onClick={handleClose}>Annuler</Button>
              {totalUnlinked > 0 ? (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleSkipAll}>Tout ignorer</Button>
                  <Button onClick={() => setStep('review')}>
                    Examiner ({totalUnlinked})
                  </Button>
                </div>
              ) : (
                <Button onClick={handleReconcile} loading={loading}>
                  <FiRefreshCw className="text-sm" />
                  Réconcilier
                </Button>
              )}
            </div>
          </>
        )}

        {step === 'review' && currentItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Transaction {currentIndex + 1} sur {totalUnlinked}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSkipAll}>
                Terminer
              </Button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${currentItem.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {currentItem.type === 'payment' ? <FiArrowUpCircle /> : <FiArrowDownCircle />}
                  </div>
                  <div>
                    <p className="font-medium">{currentItem.type === 'payment' ? 'Paiement' : 'Dépense'}</p>
                    <p className="text-sm text-slate-500">{formatDateFull(currentItem.date)}</p>
                  </div>
                </div>
                <span className={`text-xl font-bold ${currentItem.type === 'payment' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {currentItem.type === 'payment' ? '+' : '-'}{formatCurrency(currentItem.amount, 'MAD')}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{currentItem.description}</p>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="secondary" onClick={handleSkipItem}>Ignorer</Button>
              <div className="flex gap-2">
                <Button 
                  variant="danger" 
                  onClick={() => handleProcessItem('ignore')}
                  disabled={processingItem}
                >
                  Ignorer
                </Button>
                <Button 
                  onClick={() => handleProcessItem('sync')}
                  loading={processingItem}
                >
                  <FiCheck className="text-sm" />
                  Synchroniser
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
              <FiCheck className="mx-auto text-3xl text-emerald-600 mb-3" />
              <p className="font-semibold text-emerald-600">Examen terminé</p>
              <p className="text-sm text-slate-500 mt-1">
                Vous avez examiné {currentIndex + 1} transaction(s)
              </p>
            </div>
            
            <div className="flex justify-center gap-3 pt-4 border-t">
              <Button onClick={handleReconcile} loading={loading}>
                <FiRefreshCw className="text-sm" />
                Finaliser la réconciliation
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3 pt-4 border-t">
            {result.error ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
                <p className="font-semibold">Erreur</p>
                <p>{result.message}</p>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-3">
                  <FiCheck />
                  <span className="font-semibold">Réconciliation terminée</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Paiements synchronisés</p>
                    <p className="font-semibold">{result.createdForPayments}</p>
                    <p className="text-emerald-600">{formatCurrency(result.totalPaymentAmount || 0, 'MAD')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Dépenses synchronisées</p>
                    <p className="font-semibold">{result.createdForExpenses}</p>
                    <p className="text-red-600">-{formatCurrency(result.totalExpenseAmount || 0, 'MAD')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'intro' && result && (
          <div className="flex justify-end pt-4 border-t">
            <Button variant="secondary" onClick={handleClose}>Fermer</Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

const CashFlowChart = ({ data, currency }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400">
        Pas de données disponibles
      </div>
    );
  }

  const chartData = data.slice(-7);
  
  const values = chartData.flatMap(d => [d.income || 0, d.expenses || 0].filter(v => v > 0));
  const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const stdDev = values.length > 0 ? Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length) : 0;
  const threshold = mean + (stdDev * 2);

  const maxValue = Math.max(...chartData.map(d => Math.max(d.income || 0, d.expenses || 0)));

  return (
    <div className="space-y-2">
      {chartData.map((day, idx) => {
        const income = day.income || 0;
        const expenses = day.expenses || 0;
        const incomePercent = maxValue > 0 ? (income / maxValue) * 100 : 0;
        const expensePercent = maxValue > 0 ? (expenses / maxValue) * 100 : 0;
        const dateLabel = day._id.length === 10 
          ? new Date(day._id).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
          : day._id;

        const isIncomeOutlier = income > threshold && threshold > 0;
        const isExpenseOutlier = expenses > threshold && threshold > 0;

        return (
          <div key={idx} className="flex items-center gap-3 group relative">
            <div className="w-20 text-xs text-slate-500 truncate">{dateLabel}</div>
            <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex relative">
              <div 
                className={`h-full bg-emerald-500 transition-all ${isIncomeOutlier ? 'bg-emerald-400' : ''}`} 
                style={{ width: `${incomePercent}%` }} 
                title={isIncomeOutlier ? `Valeur inhabituelle: ${formatCurrency(income, currency)}` : ''}
              />
              <div 
                className={`h-full bg-red-500 transition-all ${isExpenseOutlier ? 'bg-red-400' : ''}`} 
                style={{ width: `${expensePercent}%` }}
                title={isExpenseOutlier ? `Valeur inhabituelle: ${formatCurrency(expenses, currency)}` : ''}
              />
            </div>
            <div className="w-36 text-right text-xs">
              <span className={`${isIncomeOutlier ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-emerald-600'}`}>
                +{formatCurrency(income, currency)}
              </span>
              <span className={`ml-2 ${isExpenseOutlier ? 'text-red-700 dark:text-red-300 font-bold' : 'text-red-600'}`}>
                -{formatCurrency(expenses, currency)}
              </span>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded" /> Entrées</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> Dépenses</span>
        {threshold > 0 && (
          <span className="ml-auto text-xs" title="Les valeurs dépassant 2x la moyenne sont marquées">
            <span className="inline-block w-2 h-2 bg-emerald-400 rounded mx-1"></span>
            <span className="inline-block w-2 h-2 bg-red-400 rounded mx-1"></span>
           异常值
          </span>
        )}
      </div>
    </div>
  );
};

const Caisse = () => {
  const { billing, getSafeCurrency } = useSettings();
  const currency = getSafeCurrency(billing?.currency);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    balance: 0,
    totalIn: 0,
    totalOut: 0,
    netCashFlow: 0,
    totalManual: 0,
    unlinkedPayments: { count: 0, total: 0 },
    unlinkedExpenses: { count: 0, total: 0 },
    bySource: {},
    recent: [],
  });
  const [chartData, setChartData] = useState([]);
  const [unlinkedPaymentsList, setUnlinkedPaymentsList] = useState([]);
  const [unlinkedExpensesList, setUnlinkedExpensesList] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [defaultTransactionType, setDefaultTransactionType] = useState('out');

  const [filters, setFilters] = useState({
    type: 'all',
    source: 'all',
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
      if (filters.source !== 'all') params.source = filters.source;
      if (filters.method !== 'all') params.method = filters.method;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      params.limit = 500;

      const [transRes, summaryRes, chartRes, unlinkedRes] = await Promise.all([
        cashTransactionService.getAll(params),
        cashTransactionService.getSummary({
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        }),
        cashTransactionService.getChartData({ period: 'daily' }),
        cashTransactionService.getUnlinked(),
      ]);

      setTransactions(transRes.data || []);
      setUnlinkedPaymentsList(unlinkedRes.payments || []);
      setUnlinkedExpensesList(unlinkedRes.expenses || []);
      setSummary({
        balance: summaryRes.balance || 0,
        totalIn: summaryRes.totalIn || 0,
        totalOut: summaryRes.totalOut || 0,
        netCashFlow: summaryRes.netCashFlow || 0,
        totalManual: summaryRes.totalManual || 0,
        unlinkedPayments: summaryRes.unlinkedPayments || { count: 0, total: 0 },
        unlinkedExpenses: summaryRes.unlinkedExpenses || { count: 0, total: 0 },
        bySource: summaryRes.bySource || {},
        recent: summaryRes.recent || [],
      });
      setChartData(chartRes.data || []);

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
    const handleCashUpdated = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener(EVENT_NAME, handleCashUpdated);
    return () => window.removeEventListener(EVENT_NAME, handleCashUpdated);
  }, []);

  const handleAddTransaction = (type = 'out') => {
    setDefaultTransactionType(type);
    setEditingTransaction(null);
    setShowModal(true);
  };

  const handleEditTransaction = (transaction) => {
    if (transaction.source !== 'manual') {
      setSelectedTransaction(transaction);
      setShowDetailModal(true);
    } else {
      setEditingTransaction(transaction);
      setShowModal(true);
    }
  };

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Supprimer cette transaction ?')) return;
    try {
      await cashTransactionService.delete(id);
      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  const handleReconcileSuccess = () => {
    setRefreshKey(prev => prev + 1);
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      const dateKey = new Date(t.date).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: new Date(t.date),
          transactions: [],
          totals: { in: 0, out: 0 }
        };
      }
      groups[dateKey].transactions.push(t);
      if (t.type === 'in') groups[dateKey].totals.in += t.amount;
      else groups[dateKey].totals.out += t.amount;
    });
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [transactions]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Source', 'Description', 'Méthode', 'Catégorie', 'Montant', 'Statut'];
    const rows = transactions.map(t => [
      formatDateFull(t.date),
      t.type === 'in' ? 'Entrée' : 'Sortie',
      t.source,
      t.description,
      t.method,
      t.category,
      t.amount,
      t.status,
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
      cash: 'Espèces', virement: 'Virement', cheque: 'Chèque',
      carte: 'Carte', traite: 'Traite', autre: 'Autre'
    };
    return labels[method] || method;
  };

  const getSourceBadge = (source) => {
    const variants = {
      invoice: 'info',
      expense: 'warning',
      manual: 'default',
      refund: 'danger',
    };
    const labels = {
      invoice: 'Facture',
      expense: 'Dépense',
      manual: 'Manuel',
      refund: 'Remboursement',
    };
    return <Badge variant={variants[source] || 'default'}>{labels[source] || source}</Badge>;
  };

  const hasUnlinked = summary.unlinkedPayments.count > 0 || summary.unlinkedExpenses.count > 0;
  const totalUnlinked = (summary.unlinkedPayments.total || 0) + (summary.unlinkedExpenses.total || 0);

  return (
    <PageLayout
      title="Caisse"
      subtitle={hasUnlinked ? `${summary.unlinkedPayments.count + summary.unlinkedExpenses.count} transactions non synchronisées` : 'Toutes synchronisées'}
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowReconcileModal(true)} title="Réconcilier">
            <FiRefreshCw className="text-sm" />
            Réconcilier
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            <FiDownload className="text-sm" />
            Export
          </Button>
          <Button onClick={() => handleAddTransaction('in')}>
            <FiPlus className="text-sm" />
            Entrée
          </Button>
          <Button variant="danger" onClick={() => handleAddTransaction('out')}>
            <FiPlus className="text-sm" />
            Sortie
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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
            subtitle={`${summary.bySource?.invoice?.count || 0} transactions`}
            icon={FiTrendingUp}
            color={hasUnlinked ? 'warning' : 'success'}
          />
          <StatCard
            title="Dépenses Payées"
            value={formatCurrency(summary.totalOut, currency)}
            subtitle={`${summary.bySource?.expense?.count || 0} transactions`}
            icon={FiTrendingDown}
            color="danger"
          />
          <StatCard
            title="Flux Net"
            value={formatCurrency(summary.netCashFlow, currency)}
            subtitle={summary.netCashFlow >= 0 ? 'Bénéfice net' : 'Perte nette'}
            icon={summary.netCashFlow >= 0 ? FiTrendingUp : FiTrendingDown}
            color={summary.netCashFlow >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            title="Non Synchronisé"
            value={formatCurrency(totalUnlinked, currency)}
            subtitle={`${(summary.unlinkedPayments.count || 0) + (summary.unlinkedExpenses.count || 0)} transactions`}
            icon={hasUnlinked ? FiAlertTriangle : FiCheck}
            color={hasUnlinked ? 'warning' : 'success'}
            onClick={() => hasUnlinked && setShowReconcileModal(true)}
          />
          <StatCard
            title="Transactions"
            value={transactions.length}
            subtitle={`${groupedTransactions.length} jours`}
            icon={FiActivity}
            color="info"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-4 lg:col-span-2">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <FiFilter className="text-slate-400" />
              Filtres
            </h3>
            <div className="flex flex-wrap gap-4 items-end">
              <Select
                label="Type"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-32"
              >
                <option value="all">Tous</option>
                <option value="in">Entrées</option>
                <option value="out">Sorties</option>
              </Select>
              <Select
                label="Source"
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="w-36"
              >
                <option value="all">Toutes</option>
                <option value="invoice">Factures</option>
                <option value="expense">Dépenses</option>
                <option value="manual">Manuelles</option>
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
                className="w-36"
              />
              <Input
                label="Date fin"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-36"
              />
              <Button
                variant="secondary"
                onClick={() => setFilters({ type: 'all', source: 'all', method: 'all', startDate: '', endDate: '' })}
                size="sm"
              >
                Réinitialiser
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-slate-400" />
              7 derniers jours
            </h3>
            <CashFlowChart data={chartData} currency={currency} />
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loading size="lg" /></div>
        ) : groupedTransactions.length === 0 ? (
          <Card className="p-8 text-center">
            <FiDollarSign className="mx-auto text-4xl text-slate-300 mb-3" />
            <p className="text-slate-500">Aucune transaction trouvée</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedTransactions.map((group, groupIdx) => (
              <Card key={groupIdx} className="overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="text-slate-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {group.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {group.transactions.length} transaction{group.transactions.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-600 font-medium">
                      +{formatCurrency(group.totals.in, currency)}
                    </span>
                    <span className="text-red-600 font-medium">
                      -{formatCurrency(group.totals.out, currency)}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group flex items-center gap-3"
                      onClick={() => handleViewTransaction(transaction)}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-lg ${transaction.type === 'in' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {transaction.type === 'in' ? <FiArrowUpCircle /> : <FiArrowDownCircle />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
                            {transaction.description}
                          </span>
                          {getSourceBadge(transaction.source)}
                          {transaction.status === 'pending' && (
                            <Badge variant="warning" className="text-xs shrink-0">En attente</Badge>
                          )}
                          {(transaction.source === 'invoice' || transaction.source === 'expense') && (
                            <span className="text-emerald-500 shrink-0"><FiCheck className="text-xs" /></span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="shrink-0">{getMethodLabel(transaction.method)}</span>
                          <span className="capitalize shrink-0">{transaction.category}</span>
                          {transaction.reference && <span className="font-mono truncate max-w-[100px]">{transaction.reference}</span>}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right min-w-[100px]">
                        <span className={`font-semibold whitespace-nowrap ${transaction.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {transaction.type === 'in' ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                        </span>
                      </div>

                      <div className="flex-shrink-0 flex items-center justify-end gap-1 w-16 opacity-0 group-hover:opacity-100 transition-opacity">
                        {transaction.source === 'manual' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditTransaction(transaction); }}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded shrink-0"
                              title="Modifier"
                            >
                              <FiEdit2 className="text-xs" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(transaction._id); }}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 shrink-0"
                              title="Supprimer"
                            >
                              <FiX className="text-xs" />
                            </button>
                          </>
                        )}
                        <FiChevronRight className="text-slate-400 text-xs" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        editingTransaction={editingTransaction}
        defaultType={defaultTransactionType}
      />

      <TransactionDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        transaction={selectedTransaction}
        currency={currency}
      />

      <ReconcileModal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        onSuccess={handleReconcileSuccess}
        unlinkedData={{
          payments: unlinkedPaymentsList,
          expenses: unlinkedExpensesList
        }}
      />
    </PageLayout>
  );
};

export default Caisse;
