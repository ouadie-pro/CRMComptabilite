import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading, Textarea } from '../../components/ui';
import { interactionService, clientService } from '../../services';
import { formatDateShort } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';

const InteractionForm = ({ interaction, onSubmit, onCancel, loading }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    clientId: interaction?.clientId?._id || interaction?.clientId || '',
    type: interaction?.type || 'call',
    subject: interaction?.subject || '',
    description: interaction?.description || '',
    date: interaction?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    nextAction: interaction?.nextAction || '',
    nextActionDate: interaction?.nextActionDate?.split('T')[0] || '',
  });
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientService.getAll({ limit: 100 });
        const clientsData = Array.isArray(response) ? response : (response.data || []);
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submit - user:', user, 'formData:', formData);
    const dataToSubmit = {
      ...formData,
      userId: user?._id || user?.id,
      clientId: formData.clientId,
    };
    console.log('Submitting:', dataToSubmit);
    onSubmit(dataToSubmit);
  };

  const typeOptions = [
    { value: 'call', label: 'Appel' },
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Réunion' },
    { value: 'note', label: 'Note' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="Client" name="clientId" value={formData.clientId} onChange={handleChange} required disabled={loadingClients}>
        <option value="">Sélectionner un client</option>
        {clients.map(client => (
          <option key={client._id} value={client._id}>{client.companyName}</option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Type" name="type" value={formData.type} onChange={handleChange}>
          {typeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <Input label="Date" name="date" type="date" value={formData.date} onChange={handleChange} required />
      </div>
      <Input label="Sujet" name="subject" value={formData.subject} onChange={handleChange} required />
      <Textarea label="Description" name="description" value={formData.description} onChange={handleChange} rows={3} />
      <Input label="Prochaine action" name="nextAction" value={formData.nextAction} onChange={handleChange} />
      <Input label="Date prochaine action" name="nextActionDate" type="date" value={formData.nextActionDate} onChange={handleChange} />
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
};

const Interactions = () => {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const params = typeFilter !== 'all' ? { type: typeFilter } : {};
      const response = await interactionService.getAll(params);
      const data = response.data || response;
      setInteractions(data);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInteractions(); }, [typeFilter]);

  const [error, setError] = useState(null);

  const handleSubmit = async (data) => {
    setSubmitting(true);
    setError(null);
    try {
      await interactionService.create(data);
      setShowModal(false);
      fetchInteractions();
    } catch (err) {
      console.error('Error saving interaction:', err);
      const message = err.response?.data?.message || 'Erreur lors de l\'enregistrement';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (interactionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette interaction ?')) return;
    try {
      await interactionService.delete(interactionId);
      fetchInteractions();
    } catch (error) {
      console.error('Error deleting interaction:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getTypeBadge = (type) => {
    const variants = {
      call: 'info',
      email: 'primary',
      meeting: 'warning',
      note: 'default',
    };
    const labels = {
      call: 'Appel',
      email: 'Email',
      meeting: 'Réunion',
      note: 'Note',
    };
    return <Badge variant={variants[type] || 'default'}>{labels[type] || type}</Badge>;
  };

  const columns = [
    { key: 'date', header: 'Date', render: (row) => formatDateShort(row.date) },
    { key: 'clientId', header: 'Client', render: (row) => row.clientId?.companyName || '-' },
    { key: 'type', header: 'Type', render: (row) => getTypeBadge(row.type) },
    { key: 'subject', header: 'Sujet', render: (row) => <span className="font-medium">{row.subject}</span> },
    { key: 'description', header: 'Description', render: (row) => <span className="text-slate-500 text-sm truncate max-w-xs">{row.description}</span> },
    { key: 'actions', header: '', width: '60px', render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => handleDelete(row._id)} className="text-red-500 hover:text-red-700">
        <FiTrash2 className="text-sm" />
      </Button>
    ) },
  ];

  return (
    <PageLayout 
      title="Interactions" 
      actions={
        <Button onClick={() => setShowModal(true)}>
          <FiPlus />
          Nouvelle Interaction
        </Button>
      }
    >
      <div className="space-y-6">
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-48">
          <option value="all">Tous les types</option>
          <option value="call">Appel</option>
          <option value="email">Email</option>
          <option value="meeting">Réunion</option>
          <option value="note">Note</option>
        </Select>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : (
          <DataTable columns={columns} data={interactions} emptyMessage="Aucune interaction" />
        )}
      </div>
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setError(null); }} title="Nouvelle interaction">
        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
        <InteractionForm onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setError(null); }} loading={submitting} />
      </Modal>
    </PageLayout>
  );
};

export default Interactions;
