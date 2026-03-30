import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Card, Badge, Button, Loading, Modal, Input, Select } from '../../components/ui';
import { clientService, invoiceService, interactionService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FiEdit2, FiPlusCircle, FiHome, FiMapPin, FiCreditCard, FiMail, FiPhone, FiPhoneCall, FiMessageSquare, FiTrash2 } from 'react-icons/fi';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { billing } = useSettings();
  const currency = billing?.currency || 'MAD';
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [deleting, setDeleting] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;
    setDeleting(invoiceId);
    try {
      await invoiceService.delete(invoiceId);
      setInvoices(invoices.filter(inv => inv._id !== invoiceId));
      if (window.refreshReports) window.refreshReports();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteInteraction = async (interactionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette interaction ?')) return;
    setDeleting(interactionId);
    try {
      await interactionService.delete(interactionId);
      setInteractions(interactions.filter(int => int._id !== interactionId));
    } catch (error) {
      console.error('Error deleting interaction:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const handleEditClick = () => {
    setEditFormData({
      companyName: client.companyName || '',
      contactName: client.contactName || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      country: client.country || '',
      ice: client.ice || '',
      status: client.status === 'actif' ? 'active' : 'inactive',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...editFormData,
        status: editFormData.status === 'active' ? 'actif' : 'inactif',
      };
      await clientService.update(id, payload);
      const updatedClient = await clientService.getById(id);
      setClient(updatedClient.data || updatedClient);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientRes, invoicesRes, interactionsRes] = await Promise.all([
          clientService.getById(id),
          invoiceService.getAll({ client: id }),
          interactionService.getAll({ client: id }),
        ]);
        setClient(clientRes.data || clientRes);
        setInvoices((invoicesRes.data || invoicesRes).slice(0, 5));
        setInteractions((interactionsRes.data || interactionsRes).slice(0, 5));
      } catch (error) {
        console.error('Error fetching client data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <PageLayout title="Fiche Client">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </PageLayout>
    );
  }

  if (!client) {
    return (
      <PageLayout title="Client non trouvé">
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">Le client demandé n'existe pas.</p>
          <Link to="/clients"><Button>Retour aux clients</Button></Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title={client.companyName}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditClick}>
            <FiEdit2 className="text-sm" />
            Modifier
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Client Info Card */}
        <Card>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <FiHome className="text-5xl text-slate-300 dark:text-slate-600" />
            </div>
            <div className="flex-1 grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-4">{client.companyName}</h3>
                <div className="space-y-2">
                  {client.address && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <FiMapPin className="text-sm" />
                      <span className="text-sm">{client.address}{client.city && `, ${client.city}`}</span>
                    </div>
                  )}
                  {client.ice && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <FiCreditCard className="text-sm" />
                      <span className="text-sm font-mono">ICE: {client.ice}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <FiMail className="text-sm" />
                      <span className="text-sm">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <FiPhone className="text-sm" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <Badge variant={client.status === 'actif' || client.status === 'active' ? 'success' : 'default'} className="mb-4">
                  {client.status === 'actif' || client.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Encours Client</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(client.totalBilled || 0, currency)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="flex gap-8 overflow-x-auto">
            {['invoices', 'interactions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-primary'
                }`}
              >
                {tab === 'invoices' ? 'Factures' : 'Historique des interactions'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'invoices' && (
          <Card title="Factures">
            {invoices.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Aucune facture</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-primary">{invoice.number || invoice.invoiceNumber}</span>
                      <span className="text-sm text-slate-500">{formatDate(invoice.issueDate || invoice.date)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold">{formatCurrency(invoice.totalTTC || invoice.total || 0, currency)}</span>
                      <Badge variant={invoice.status === 'payé' || invoice.status === 'paid' ? 'success' : invoice.status === 'en_retard' || invoice.status === 'overdue' ? 'danger' : 'warning'}>
                        {invoice.status === 'payé' ? 'Payé' : invoice.status === 'paid' ? 'Payé' : invoice.status === 'en_retard' || invoice.status === 'overdue' ? 'En retard' : invoice.status === 'envoyé' || invoice.status === 'sent' ? 'Envoyé' : 'Brouillon'}
                      </Badge>
                      <button
                        onClick={() => handleDeleteInvoice(invoice._id)}
                        disabled={deleting === invoice._id}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'interactions' && (
          <Card title="Historique">
            {interactions.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Aucune interaction</p>
            ) : (
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <div key={interaction._id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {interaction.type === 'call' ? <FiPhoneCall className="text-primary" /> : interaction.type === 'email' ? <FiMail className="text-primary" /> : <FiMessageSquare className="text-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{interaction.title || interaction.type}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{formatDate(interaction.date)}</span>
                          <button
                            onClick={() => handleDeleteInteraction(interaction._id)}
                            disabled={deleting === interaction._id}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">{interaction.notes || interaction.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier le client" size="lg">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom de l'entreprise"
              value={editFormData.companyName || ''}
              onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
              required
            />
            <Input
              label="Nom du contact"
              value={editFormData.contactName || ''}
              onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={editFormData.email || ''}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              required
            />
            <Input
              label="Téléphone"
              value={editFormData.phone || ''}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
          </div>
          <Input
            label="Adresse"
            value={editFormData.address || ''}
            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Ville"
              value={editFormData.city || ''}
              onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
            />
            <Input
              label="Pays"
              value={editFormData.country || ''}
              onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
            />
            <Input
              label="ICE"
              value={editFormData.ice || ''}
              onChange={(e) => setEditFormData({ ...editFormData, ice: e.target.value })}
            />
          </div>
          <Select
            label="Statut"
            value={editFormData.status || 'active'}
            onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
          >
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </Select>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
};

export default ClientDetail;
