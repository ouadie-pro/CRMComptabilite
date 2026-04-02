import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading } from '../../components/ui';
import { expenseService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiEdit2, FiPlus, FiTrash2, FiCheckSquare, FiSquare, FiCheckCircle, FiPaperclip, FiDownload } from 'react-icons/fi';
import api from '../../services/api';

const ExpenseForm = ({ expense, onSubmit, onCancel, loading, error }) => {
  const { billing } = useSettings();
  const [formData, setFormData] = useState({
    description: expense?.description || '',
    category: expense?.category || 'autre',
    amount: expense?.amount !== undefined ? String(expense.amount) : '',
    date: expense?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    vendor: expense?.vendor || '',
    status: expense?.status || 'pending',
    paymentMethod: expense?.paymentMethod || 'cash',
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value 
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Veuillez entrer un montant valide supérieur à 0');
      return;
    }
    
    const dataToSubmit = {
      ...formData,
      amount: amount
    };
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}
      <Input label="Description" name="description" value={formData.description} onChange={handleChange} required />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Catégorie" name="category" value={formData.category} onChange={handleChange}>
          <option value="salaire">Salaire</option>
          <option value="loyer">Loyer</option>
          <option value="services">Services</option>
          <option value="fournitures">Fournitures</option>
          <option value="transport">Transport</option>
          <option value="autre">Autre</option>
        </Select>
        <Input label="Montant" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date" name="date" type="date" value={formData.date} onChange={handleChange} />
        <Input label="Fournisseur" name="vendor" value={formData.vendor} onChange={handleChange} />
      </div>
      <Select label="Statut" name="status" value={formData.status} onChange={handleChange}>
        <option value="pending">En attente</option>
        <option value="approved">Approuvé</option>
        <option value="rejected">Rejeté</option>
      </Select>
      <Select label="Méthode de paiement" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
        <option value="cash">Espèces</option>
        <option value="virement">Virement</option>
        <option value="cheque">Chèque</option>
        <option value="carte">Carte bancaire</option>
        <option value="traite">Traite</option>
        <option value="autre">Autre</option>
      </Select>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
};

const Expenses = () => {
  const { billing, getSafeCurrency } = useSettings();
  const currency = getSafeCurrency(billing?.currency);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = categoryFilter !== 'all' ? { category: categoryFilter } : {};
      const response = await expenseService.getAll(params);
      setExpenses(response.data || response);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [categoryFilter]);

  const handleSubmit = async (data) => {
    setSubmitting(true);
    setError(null);
    try {
      if (editingExpense) await expenseService.update(editingExpense._id, data);
      else await expenseService.create(data);
      setShowModal(false);
      fetchExpenses();
      window.dispatchEvent(new Event('cashUpdated'));
      if (window.refreshReports) window.refreshReports();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;
    try {
      await expenseService.delete(expenseId);
      fetchExpenses();
      window.dispatchEvent(new Event('cashUpdated'));
      if (window.refreshReports) window.refreshReports();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const toggleSelectExpense = (expenseId) => {
    setSelectedExpenses(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const toggleSelectAll = () => {
    const pendingExpenses = expenses.filter(exp => exp.status === 'pending').map(exp => exp._id);
    if (selectedExpenses.length === pendingExpenses.length && pendingExpenses.every(id => selectedExpenses.includes(id))) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(pendingExpenses);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedExpenses.length === 0) {
      alert('Veuillez sélectionner au moins une dépense');
      return;
    }
    setBulkActionLoading(true);
    try {
      await expenseService.bulkApprove(selectedExpenses);
      setSelectedExpenses([]);
      fetchExpenses();
      window.dispatchEvent(new Event('cashUpdated'));
      if (window.refreshReports) window.refreshReports();
    } catch (error) {
      console.error('Error approving expenses:', error);
      alert('Erreur lors de l\'approbation');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedExpenses.length === 0) {
      alert('Veuillez sélectionner au moins une dépense');
      return;
    }
    setBulkActionLoading(true);
    try {
      await expenseService.bulkReject(selectedExpenses);
      setSelectedExpenses([]);
      fetchExpenses();
    } catch (error) {
      console.error('Error rejecting expenses:', error);
      alert('Erreur lors du rejet');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const statusLabels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };

  const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const approvedAmount = expenses.filter(exp => exp.status === 'approved').reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const pendingAmount = expenses.filter(exp => exp.status === 'pending').reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const categoryTotals = expenses.reduce((acc, exp) => {
    const cat = exp.category || 'autre';
    acc[cat] = (acc[cat] || 0) + (exp.amount || 0);
    return acc;
  }, {});

  const budgetByCategory = {
    salaire: 15000,
    loyer: 5000,
    services: 3000,
    fournitures: 2000,
    transport: 1500,
    autre: 1000
  };

  const handleAttachmentUpload = async (expenseId, file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    try {
      await api.post(`/expenses/upload/${expenseId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error uploading attachment:', error);
      alert('Erreur lors de l\'upload du justificatif');
    }
  };

  const columns = [
    { key: 'select', header: '', width: '50px', render: (row) => (
      row.status === 'pending' ? (
        <button
          onClick={() => toggleSelectExpense(row._id)}
          className="text-slate-400 hover:text-primary transition-colors"
        >
          {selectedExpenses.includes(row._id) ? <FiCheckSquare className="text-primary" /> : <FiSquare />}
        </button>
      ) : null
    )},
    { key: 'date', header: 'Date', render: (row) => formatDateShort(row.date) },
    { key: 'description', header: 'Description', render: (row) => <span className="font-medium">{row.description}</span> },
    { key: 'category', header: 'Catégorie', render: (row) => <Badge>{row.category}</Badge> },
    { key: 'vendor', header: 'Fournisseur' },
    { key: 'amount', header: 'Montant', render: (row) => formatCurrency(row.amount || 0, currency) },
    { key: 'attachment', header: 'Justificatif', width: '80px', render: (row) => (
      <div className="flex items-center gap-1">
        {row.attachmentUrl ? (
          <a href={row.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
            <FiPaperclip className="text-sm" />
            <FiDownload className="text-xs" />
          </a>
        ) : (
          <label className="cursor-pointer text-slate-400 hover:text-primary">
            <FiPaperclip className="text-sm" />
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={(e) => { if (e.target.files[0]) handleAttachmentUpload(row._id, e.target.files[0]); }} />
          </label>
        )}
      </div>
    )},
    { key: 'status', header: 'Statut', render: (row) => <Badge variant={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{statusLabels[row.status] || row.status}</Badge> },
    { key: 'actions', header: '', width: '120px', render: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => { setEditingExpense(row); setShowModal(true); }}>
          <FiEdit2 className="text-sm" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleDelete(row._id)} className="text-red-500 hover:text-red-700">
          <FiTrash2 className="text-sm" />
        </Button>
      </div>
    ) },
  ];

  return (
    <PageLayout title="Dépenses" actions={<Button onClick={() => { setEditingExpense(null); setShowModal(true); }}><FiPlus />Nouvelle Dépense</Button>}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
            <option value="all">Toutes catégories</option>
            <option value="salaire">Salaire</option>
            <option value="loyer">Loyer</option>
            <option value="services">Services</option>
            <option value="fournitures">Fournitures</option>
            <option value="transport">Transport</option>
            <option value="autre">Autre</option>
          </Select>
          
          {selectedExpenses.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{selectedExpenses.length} sélectionné(s)</span>
              <Button variant="success" size="sm" onClick={handleBulkApprove} loading={bulkActionLoading}>
                <FiCheckCircle className="text-sm" />
                Approuver
              </Button>
              <Button variant="danger" size="sm" onClick={handleBulkReject} loading={bulkActionLoading}>
                Rejeter
              </Button>
            </div>
          )}
        </div>
        
        {loading ? <div className="flex items-center justify-center h-64"><Loading size="lg" /></div> : (
          <>
            <DataTable columns={columns} data={expenses} emptyMessage="Aucune dépense" />
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-sm text-slate-500">Total général</span>
                  <span className="ml-2 font-semibold text-slate-900 dark:text-white">{formatCurrency(totalAmount, currency)}</span>
                  <span className="ml-2 font-semibold text-emerald-600">{formatCurrency(approvedAmount, currency)}</span>
                  <span className="ml-2 font-semibold text-amber-600">{formatCurrency(pendingAmount, currency)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Budget vs Réel par catégorie</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(budgetByCategory).map(([cat, budget]) => {
                  const actual = categoryTotals[cat] || 0;
                  const percent = budget > 0 ? (actual / budget) * 100 : 0;
                  const isOver = actual > budget;
                  return (
                    <div key={cat} className="text-center p-2 bg-white dark:bg-slate-900 rounded">
                      <div className="text-xs text-slate-500 capitalize">{cat}</div>
                      <div className={`text-sm font-semibold ${isOver ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                        {formatCurrency(actual, currency)}
                      </div>
                      <div className="text-xs text-slate-400">/ {formatCurrency(budget, currency)}</div>
                      <div className={`text-xs ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>
                        {percent.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setError(null); }} title={editingExpense ? 'Modifier' : 'Nouvelle dépense'}>
        <ExpenseForm expense={editingExpense} onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setError(null); }} loading={submitting} error={error} />
      </Modal>
    </PageLayout>
  );
};

export default Expenses;
