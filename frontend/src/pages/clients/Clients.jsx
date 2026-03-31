import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading, EmptyState } from '../../components/ui';
import { clientService } from '../../services';
import { formatDate, formatCurrency, getInitials } from '../../utils/formatters';
import { FiEdit2, FiEye, FiUserPlus, FiSearch, FiCheckSquare, FiSquare, FiDownload, FiTrash2, FiToggleLeft } from 'react-icons/fi';

const ClientForm = ({ client, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: client?.companyName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    country: client?.country || '',
    ice: client?.ice || '',
    status: (client?.status === 'actif' || !client) ? 'active' : 'inactive',
    creditLimit: client?.creditLimit || '',
    paymentTerms: client?.paymentTerms || '30',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nom du client / Entreprise"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <Input
          label="Téléphone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>
      <Input
        label="Adresse"
        name="address"
        value={formData.address}
        onChange={handleChange}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Ville"
          name="city"
          value={formData.city}
          onChange={handleChange}
        />
        <Input
          label="Pays"
          name="country"
          value={formData.country}
          onChange={handleChange}
        />
        <Input
          label="ICE / Identifiant"
          name="ice"
          value={formData.ice}
          onChange={handleChange}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Limite de crédit (MAD)"
          name="creditLimit"
          type="number"
          value={formData.creditLimit}
          onChange={handleChange}
          placeholder="0.00"
        />
        <Select
          label="Conditions de paiement (jours)"
          name="paymentTerms"
          value={formData.paymentTerms}
          onChange={handleChange}
        >
          <option value="7">7 jours</option>
          <option value="15">15 jours</option>
          <option value="30">30 jours</option>
          <option value="45">45 jours</option>
          <option value="60">60 jours</option>
          <option value="90">90 jours</option>
        </Select>
      </div>
      <Select
        label="Statut"
        name="status"
        value={formData.status}
        onChange={handleChange}
      >
        <option value="active">Actif</option>
        <option value="inactive">Inactif</option>
      </Select>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>
          {client ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedClients, setSelectedClients] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const statusFilterMap = {
    active: 'actif',
    inactive: 'inactif'
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = {
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilterMap[statusFilter] || statusFilter }),
      };
      const response = await clientService.getAll(params);
      const data = Array.isArray(response) ? response : (response.data || []);
      setClients(data);
      if (response.pagination) {
        setPagination(prev => ({ ...prev, ...response.pagination }));
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [pagination.page]);

  const handleCreate = () => {
    setEditingClient(null);
    setShowModal(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleSubmit = async (data) => {
    if (!data.name || !data.email) {
      alert('Veuillez remplir le nom et l\'email');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        companyName: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        ice: data.ice,
        status: data.status === 'active' ? 'actif' : 'inactif',
        creditLimit: parseFloat(data.creditLimit) || 0,
        paymentTerms: parseInt(data.paymentTerms) || 30,
      };
      if (editingClient) {
        await clientService.update(editingClient._id, payload);
      } else {
        await clientService.create(payload);
      }
      setShowModal(false);
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert(error.response?.data?.message || error.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectClient = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c._id));
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedClients.length === 0) {
      alert('Veuillez sélectionner au moins un client');
      return;
    }
    setBulkActionLoading(true);
    try {
      const status = newStatus === 'active' ? 'actif' : 'inactif';
      await Promise.all(selectedClients.map(id => 
        clientService.update(id, { status })
      ));
      setSelectedClients([]);
      fetchClients();
    } catch (error) {
      console.error('Error updating clients:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClients.length === 0) {
      alert('Veuillez sélectionner au moins un client');
      return;
    }
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedClients.length} client(s) ?`)) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedClients.map(id => 
        clientService.delete(id)
      ));
      setSelectedClients([]);
      fetchClients();
    } catch (error) {
      console.error('Error deleting clients:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExportClients = () => {
    const selectedData = selectedClients.length > 0 
      ? clients.filter(c => selectedClients.includes(c._id))
      : clients;
    
    const csvContent = [
      ['Nom', 'Email', 'Téléphone', 'Ville', 'ICE', 'Statut', 'Total Facturé', 'Limite Crédit', 'Conditions Paiement'].join(','),
      ...selectedData.map(c => [
        `"${c.companyName}"`,
        `"${c.email}"`,
        `"${c.phone || ''}"`,
        `"${c.city || ''}"`,
        `"${c.ice || ''}"`,
        c.status === 'actif' ? 'Actif' : 'Inactif',
        c.totalBilled || 0,
        c.creditLimit || 0,
        `${c.paymentTerms || 30} jours`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const columns = [
    { key: 'select', header: '', width: '50px', render: (row) => (
      <button onClick={() => toggleSelectClient(row._id)} className="text-slate-400 hover:text-primary transition-colors">
        {selectedClients.includes(row._id) ? <FiCheckSquare className="text-primary" /> : <FiSquare />}
      </button>
    )},
    {
      key: 'companyName',
      header: 'Nom',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
            {getInitials(row.companyName)}
          </div>
          <div>
            <p className="font-medium">{row.companyName}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Téléphone',
    },
    {
      key: 'city',
      header: 'Ville',
    },
    {
      key: 'totalBilled',
      header: 'Total facturé',
      render: (row) => formatCurrency(row.totalBilled || 0),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge variant={row.status === 'actif' ? 'success' : 'default'}>
          {row.status === 'actif' ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <FiEdit2 className="text-sm" />
          </Button>
          <Link to={`/clients/${row._id}`}>
            <Button variant="ghost" size="sm">
              <FiEye className="text-sm" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <PageLayout 
      title="Clients"
      actions={
        <Button onClick={handleCreate}>
          <FiUserPlus />
          Ajouter un Client
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </Select>
          </div>
          
          {selectedClients.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-slate-500">{selectedClients.length} sélectionné(s)</span>
              <Button variant="secondary" size="sm" onClick={() => handleBulkStatusChange('active')} loading={bulkActionLoading}>
                <FiToggleLeft className="text-sm mr-1" />
                Activer
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleBulkStatusChange('inactive')} loading={bulkActionLoading}>
                <FiToggleLeft className="text-sm mr-1" />
                Désactiver
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportClients}>
                <FiDownload className="text-sm mr-1" />
                Exporter
              </Button>
              <Button variant="danger" size="sm" onClick={handleBulkDelete} loading={bulkActionLoading}>
                <FiTrash2 className="text-sm mr-1" />
                Supprimer
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={clients}
            emptyMessage="Aucun client trouvé"
            pagination={{
              ...pagination,
              onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
            }}
          />
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingClient ? 'Modifier le client' : 'Nouveau client'}
        size="lg"
      >
        <ClientForm
          client={editingClient}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={submitting}
        />
      </Modal>
    </PageLayout>
  );
};

export default Clients;
