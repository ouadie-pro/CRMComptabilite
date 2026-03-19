import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading } from '../../components/ui';
import { expenseService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';

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
    const dataToSubmit = {
      ...formData,
      amount: formData.amount === '' ? 0 : formData.amount
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
  const { billing } = useSettings();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  const statusLabels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };

  const columns = [
    { key: 'date', header: 'Date', render: (row) => formatDateShort(row.date) },
    { key: 'description', header: 'Description', render: (row) => <span className="font-medium">{row.description}</span> },
    { key: 'category', header: 'Catégorie', render: (row) => <Badge>{row.category}</Badge> },
    { key: 'vendor', header: 'Fournisseur' },
    { key: 'amount', header: 'Montant', render: (row) => formatCurrency(row.amount || 0, billing?.currency || 'MAD') },
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
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
          <option value="all">Toutes catégories</option>
          <option value="salaire">Salaire</option>
          <option value="loyer">Loyer</option>
          <option value="services">Services</option>
          <option value="fournitures">Fournitures</option>
          <option value="transport">Transport</option>
          <option value="autre">Autre</option>
        </Select>
        {loading ? <div className="flex items-center justify-center h-64"><Loading size="lg" /></div> : <DataTable columns={columns} data={expenses} emptyMessage="Aucune dépense" />}
      </div>
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setError(null); }} title={editingExpense ? 'Modifier' : 'Nouvelle dépense'}>
        <ExpenseForm expense={editingExpense} onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setError(null); }} loading={submitting} error={error} />
      </Modal>
    </PageLayout>
  );
};

export default Expenses;
