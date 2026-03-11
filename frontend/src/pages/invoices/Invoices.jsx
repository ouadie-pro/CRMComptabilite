import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading } from '../../components/ui';
import { invoiceService, clientService, productService } from '../../services';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiTrash2, FiPlus, FiEdit2, FiMoreVertical } from 'react-icons/fi';

const InvoiceForm = ({ invoice, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    client: invoice?.client?._id || '',
    invoiceNumber: invoice?.invoiceNumber || '',
    date: invoice?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate?.split('T')[0] || '',
    status: invoice?.status || 'draft',
    notes: invoice?.notes || '',
  });
  const [lines, setLines] = useState(invoice?.lines || [{ description: '', quantity: 1, price: 0, vatRate: 20, discount: 0 }]);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientService.getAll({ limit: 100 });
        setClients(response.data || response);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    if (field === 'quantity' || field === 'price' || field === 'discount') {
      newLines[index].total = (newLines[index].quantity * newLines[index].price) * (1 - newLines[index].discount / 100);
    }
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, price: 0, vatRate: 20, discount: 0, total: 0 }]);
  };

  const removeLine = (index) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.price) * (1 - line.discount / 100), 0);
    const vat = lines.reduce((sum, line) => sum + (line.quantity * line.price) * (1 - line.discount / 100) * (line.vatRate / 100), 0);
    return { subtotal, vat, total: subtotal + vat };
  };

  const totals = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, lines });
  };

  const statusOptions = [
    { value: 'draft', label: 'Brouillon' },
    { value: 'sent', label: 'Envoyé' },
    { value: 'paid', label: 'Payé' },
    { value: 'overdue', label: 'En retard' },
    { value: 'cancelled', label: 'Annulé' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Client" name="client" value={formData.client} onChange={handleChange} required disabled={loadingClients}>
          <option value="">Sélectionner un client</option>
          {clients.map(client => (
            <option key={client._id} value={client._id}>{client.name}</option>
          ))}
        </Select>
        <Input
          label="N° Facture"
          name="invoiceNumber"
          value={formData.invoiceNumber}
          onChange={handleChange}
          placeholder="FACT-2024-0001"
        />
        <Input
          label="Date d'émission"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
        />
        <Input
          label="Date d'échéance"
          name="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={handleChange}
        />
        <Select
          label="Statut"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      {/* Lines */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Lignes de facturation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                <th className="pb-2 pr-4 min-w-[200px]">Description</th>
                <th className="pb-2 px-2 w-20">Qté</th>
                <th className="pb-2 px-2 w-24">Prix HT</th>
                <th className="pb-2 px-2 w-20">TVA %</th>
                <th className="pb-2 px-2 w-20">Remise %</th>
                <th className="pb-2 pl-4 text-right w-24">Total</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="py-2 pr-4">
                    <Input
                      value={line.description}
                      onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                      placeholder="Description du service"
                      className="text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => handleLineChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="text-sm text-center"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.price}
                      onChange={(e) => handleLineChange(index, 'price', parseFloat(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Select
                      value={line.vatRate}
                      onChange={(e) => handleLineChange(index, 'vatRate', parseFloat(e.target.value))}
                      className="text-sm"
                    >
                      <option value={0}>0%</option>
                      <option value={5.5}>5.5%</option>
                      <option value={10}>10%</option>
                      <option value={20}>20%</option>
                    </Select>
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={line.discount}
                      onChange={(e) => handleLineChange(index, 'discount', parseFloat(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </td>
                  <td className="py-2 pl-4 text-right font-medium">
                    {formatCurrency((line.quantity * line.price) * (1 - line.discount / 100))}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-slate-400 hover:text-red-500"
                      disabled={lines.length === 1}
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={addLine} className="mt-2">
          <FiPlus className="text-sm" />
          Ajouter une ligne
        </Button>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Sous-total HT</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">TVA</span>
            <span>{formatCurrency(totals.vat)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total TTC</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <Input
        label="Notes"
        name="notes"
        value={formData.notes}
        onChange={handleChange}
        placeholder="Conditions de règlement, informations complémentaires..."
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      };
      const response = await invoiceService.getAll(params);
      const data = response.data || response;
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [pagination.page, statusFilter]);

  const handleCreate = () => {
    setEditingInvoice(null);
    setShowModal(true);
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setShowModal(true);
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingInvoice) {
        await invoiceService.update(editingInvoice._id, data);
      } else {
        await invoiceService.create(data);
      }
      setShowModal(false);
      fetchInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      overdue: 'danger',
      cancelled: 'warning',
    };
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      paid: 'Payé',
      overdue: 'En retard',
      cancelled: 'Annulé',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'N° Facture',
      render: (row) => <span className="font-semibold text-primary">{row.invoiceNumber}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      render: (row) => row.client?.name || '-',
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => formatDateShort(row.date),
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      render: (row) => formatDateShort(row.dueDate),
    },
    {
      key: 'total',
      header: 'Montant',
      render: (row) => formatCurrency(row.total || 0),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => getStatusBadge(row.status),
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
          <Button variant="ghost" size="sm">
            <FiMoreVertical className="text-sm" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Factures"
      actions={
        <Button onClick={handleCreate}>
          <FiPlus />
          Nouvelle Facture
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="paid">Payé</option>
            <option value="overdue">En retard</option>
            <option value="cancelled">Annulé</option>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={invoices}
            emptyMessage="Aucune facture trouvée"
          />
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}
        size="xl"
      >
        <InvoiceForm
          invoice={editingInvoice}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={submitting}
        />
      </Modal>
    </PageLayout>
  );
};

export default Invoices;
