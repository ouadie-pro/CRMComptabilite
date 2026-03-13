import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading, EmptyState } from '../../components/ui';
import { clientService } from '../../services';
import { formatDate, formatCurrency, getInitials } from '../../utils/formatters';
import { FiEdit2, FiEye, FiUserPlus, FiSearch } from 'react-icons/fi';

const ClientForm = ({ client, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: client?.companyName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    country: client?.country || '',
    ice: client?.ice || '',
    status: client?.status === 'actif' ? 'active' : 'inactive',
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
  }, [pagination.page, search, statusFilter]);

  const handleCreate = () => {
    setEditingClient(null);
    setShowModal(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowModal(true);
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingClient) {
        await clientService.update(editingClient._id, data);
      } else {
        await clientService.create(data);
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

  const columns = [
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
              icon={<FiSearch className="text-sm" />}
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
