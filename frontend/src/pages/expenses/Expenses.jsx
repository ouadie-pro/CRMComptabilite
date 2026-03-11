import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading } from '../../components/ui';
import { expenseService } from '../../services';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiEdit2, FiPlus } from 'react-icons/fi';

const ExpenseForm = ({ expense, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    description: expense?.description || '',
    category: expense?.category || 'general',
    amount: expense?.amount || 0,
    date: expense?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    vendor: expense?.vendor || '',
    status: expense?.status || 'pending',
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({ ...formData, [name]: type === 'number' ? parseFloat(value) || 0 : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Description" name="description" value={formData.description} onChange={handleChange} required />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Catégorie" name="category" value={formData.category} onChange={handleChange}>
          <option value="salaries">Salaires</option>
          <option value="rent">Loyer</option>
          <option value="marketing">Marketing</option>
          <option value="software">Logiciels</option>
          <option value="logistics">Logistique</option>
          <option value="other">Divers</option>
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
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    try {
      if (editingExpense) await expenseService.update(editingExpense._id, data);
      else await expenseService.create(data);
      setShowModal(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'date', header: 'Date', render: (row) => formatDateShort(row.date) },
    { key: 'description', header: 'Description', render: (row) => <span className="font-medium">{row.description}</span> },
    { key: 'category', header: 'Catégorie', render: (row) => <Badge>{row.category}</Badge> },
    { key: 'vendor', header: 'Fournisseur' },
    { key: 'amount', header: 'Montant', render: (row) => formatCurrency(row.amount || 0) },
    { key: 'status', header: 'Statut', render: (row) => <Badge variant={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>{row.status}</Badge> },
    { key: 'actions', header: '', width: '80px', render: (row) => <Button variant="ghost" size="sm" onClick={() => { setEditingExpense(row); setShowModal(true); }}><FiEdit2 className="text-sm" /></Button> },
  ];

  return (
    <PageLayout title="Dépenses" actions={<Button onClick={() => setShowModal(true)}><FiPlus />Nouvelle Dépense</Button>}>
      <div className="space-y-6">
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
          <option value="all">Toutes catégories</option>
          <option value="salaries">Salaires</option>
          <option value="rent">Loyer</option>
          <option value="marketing">Marketing</option>
          <option value="software">Logiciels</option>
          <option value="logistics">Logistique</option>
          <option value="other">Divers</option>
        </Select>
        {loading ? <div className="flex items-center justify-center h-64"><Loading size="lg" /></div> : <DataTable columns={columns} data={expenses} emptyMessage="Aucune dépense" />}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingExpense ? 'Modifier' : 'Nouvelle dépense'}>
        <ExpenseForm expense={editingExpense} onSubmit={handleSubmit} onCancel={() => setShowModal(false)} loading={submitting} />
      </Modal>
    </PageLayout>
  );
};

export default Expenses;
