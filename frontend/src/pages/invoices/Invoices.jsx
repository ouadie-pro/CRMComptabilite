import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading } from '../../components/ui';
import { invoiceService, clientService, productService, paymentService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { generateInvoicePDF } from '../../utils/generateInvoicePDF';
import { FiTrash2, FiPlus, FiEdit2, FiDownload, FiDollarSign, FiMail, FiCopy } from 'react-icons/fi';

const InvoiceForm = ({ invoice, onSubmit, onCancel, loading, onInvoiceUpdate }) => {
  const { billing } = useSettings();
  const defaultVatRate = billing?.vatRate || 20;
  const currency = billing?.currency || 'MAD';
  
  const [formData, setFormData] = useState({
    client: invoice?.clientId?._id || invoice?.client?._id || '',
    invoiceNumber: invoice?.number || invoice?.invoiceNumber || '',
    date: invoice?.issueDate?.split('T')[0] || invoice?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate?.split('T')[0] || '',
    status: invoice?.status || 'brouillon',
    notes: invoice?.notes || '',
  });
  const [lines, setLines] = useState(() => {
    if (invoice?.items?.length > 0) {
      return invoice.items.map(item => ({
        productId: item.productId?._id || item.productId || '',
        description: item.description || item.name || '',
        quantity: item.quantity || 1,
        price: item.unitPriceHT || item.price || '',
        vatRate: item.vatRate || defaultVatRate,
        discount: item.discount || 0,
        total: item.totalHT || item.total || 0,
      }));
    }
    return [{ productId: '', description: '', quantity: 1, price: '', vatRate: defaultVatRate, discount: 0, total: 0 }];
  });
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'virement', paidAt: new Date().toISOString().split('T')[0] });
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

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
    const fetchProducts = async () => {
      try {
        const response = await productService.getAll({ limit: 100 });
        const productsData = Array.isArray(response) ? response : (response.data || []);
        setProducts(productsData.filter(p => p.status === 'actif'));
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchClients();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (invoice?._id) {
      console.log('[InvoiceForm] useEffect - fetching payments for invoice:', invoice._id);
      setLoadingPayments(true);
      const params = { invoiceId: invoice._id };
      console.log('[InvoiceForm] Calling API with params:', params);
      paymentService.getAll(params)
        .then(response => {
          console.log('[InvoiceForm] getAllPayments raw response:', response);
          console.log('[InvoiceForm] Response type:', typeof response, Array.isArray(response));
          const paymentsData = Array.isArray(response) ? response : response.data || [];
          console.log('[InvoiceForm] Setting payments:', paymentsData.length);
          setPayments(paymentsData);
        })
        .catch(err => console.error('Error fetching payments:', err))
        .finally(() => setLoadingPayments(false));
    } else {
      console.log('[InvoiceForm] No invoice._id, clearing payments');
      setPayments([]);
    }
  }, [invoice?._id, invoice?.updatedAt, paymentsRefreshKey]);

  useEffect(() => {
    if (invoice?.status) {
      setFormData(prev => ({ ...prev, status: invoice.status }));
    }
  }, [invoice?.status]);

  const calculateTotalPaid = () => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }
    setAddingPayment(true);
    try {
      const paymentData = {
        invoiceId: invoice._id,
        clientId: invoice.clientId?._id || invoice.clientId,
        amount: parseFloat(newPayment.amount),
        method: newPayment.method,
        paidAt: newPayment.paidAt,
      };
      console.log('[InvoiceForm] Creating payment with data:', paymentData);
      
      const response = await paymentService.create(paymentData);
      console.log('[InvoiceForm] Payment created successfully:', response);
      
      const updatedInvoice = await invoiceService.getById(invoice._id);
      console.log('[InvoiceForm] Updated invoice:', updatedInvoice);
      if (onInvoiceUpdate) onInvoiceUpdate(updatedInvoice);
      setPaymentsRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('cashUpdated'));
      setNewPayment({ amount: '', method: 'virement', paidAt: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('[InvoiceForm] Error adding payment:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de l\'ajout du paiement';
      alert(errorMessage);
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Supprimer ce paiement ?')) return;
    try {
      await paymentService.delete(paymentId);
      
      const updatedInvoice = await invoiceService.getById(invoice._id);
      if (onInvoiceUpdate) onInvoiceUpdate(updatedInvoice);
      setPaymentsRefreshKey(prev => prev + 1);
      window.dispatchEvent(new Event('cashUpdated'));
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    
    if (field === 'productId' && value) {
      const product = products.find(p => p._id === value);
      if (product) {
        newLines[index].productId = product._id;
        newLines[index].description = product.name;
        newLines[index].price = product.priceHT;
        newLines[index].vatRate = product.vatRate || defaultVatRate;
      }
    }
    
    if (field === 'quantity' || field === 'price' || field === 'discount') {
      const price = parseFloat(newLines[index].price) || 0;
      const qty = parseInt(newLines[index].quantity) || 0;
      const discount = parseFloat(newLines[index].discount) || 0;
      newLines[index].total = (qty * price) * (1 - discount / 100);
    }
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { productId: '', description: '', quantity: 1, price: '', vatRate: defaultVatRate, discount: 0, total: 0 }]);
  };

  const removeLine = (index) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => {
      const price = parseFloat(line.price) || 0;
      const qty = parseInt(line.quantity) || 0;
      const discount = parseFloat(line.discount) || 0;
      return sum + (qty * price) * (1 - discount / 100);
    }, 0);
    const vat = lines.reduce((sum, line) => {
      const price = parseFloat(line.price) || 0;
      const qty = parseInt(line.quantity) || 0;
      const discount = parseFloat(line.discount) || 0;
      const vrate = parseFloat(line.vatRate) || 0;
      return sum + (qty * price) * (1 - discount / 100) * (vrate / 100);
    }, 0);
    return { subtotal, vat, total: subtotal + vat };
  };

  const totals = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, lines });
  };

  const statusOptions = [
    { value: 'brouillon', label: 'Brouillon' },
    { value: 'envoyé', label: 'Envoyé' },
    { value: 'payé', label: 'Payé' },
    { value: 'en_retard', label: 'En retard' },
    { value: 'annulé', label: 'Annulé' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Client" name="client" value={formData.client} onChange={handleChange} required disabled={loadingClients}>
          <option value="">Sélectionner un client</option>
          {clients.map(client => (
            <option key={client._id} value={client._id}>{client.companyName}</option>
          ))}
        </Select>
        <Input
          label="N° Facture"
          name="invoiceNumber"
          value={formData.invoiceNumber}
          onChange={handleChange}
          placeholder="FACT-2024-0001 (optionnel)"
        />
        <p className="text-xs text-slate-500 -mt-2">Laisser vide pour génération automatique</p>
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
                <th className="pb-2 pr-4 min-w-[180px]">Produit</th>
                <th className="pb-2 pr-4 min-w-[180px]">Description</th>
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
                    <select
                      value={line.productId || ''}
                      onChange={(e) => handleLineChange(index, 'productId', e.target.value)}
                      className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800"
                      disabled={loadingProducts}
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map(product => (
                        <option key={product._id} value={product._id}>{product.name}</option>
                      ))}
                    </select>
                  </td>
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
                    {formatCurrency((line.quantity * line.price) * (1 - line.discount / 100), currency)}
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
            <span>{formatCurrency(totals.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">TVA</span>
            <span>{formatCurrency(totals.vat, currency)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total TTC</span>
            <span>{formatCurrency(totals.total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Payments Section - Only show when editing existing invoice */}
      {invoice?._id && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <FiDollarSign className="text-primary" />
            Paiements
          </h3>
          
          {/* Payment Summary - Live calculated values */}
          {(() => {
            const liveTotalPaid = calculateTotalPaid();
            const totalTTC = invoice.totalTTC || totals.total;
            const remaining = totalTTC - liveTotalPaid;
            const liveStatus = liveTotalPaid >= totalTTC 
              ? 'payé' 
              : liveTotalPaid > 0 
                ? 'partiellement payé' 
                : invoice.status;
            
            return (
              <>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Total facture</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(totalTTC, currency)}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Total payé</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(liveTotalPaid, currency)}
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Reste à payer</div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(Math.max(0, remaining), currency)}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Statut</div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 capitalize">
                      {liveStatus === 'partiellement payé' ? 'Partiellement payé' : 
                       liveStatus === 'en_retard' ? 'En retard' : 
                       liveStatus || 'brouillon'}
                    </div>
                  </div>
                </div>

                {/* Add Payment Form */}
                <div onSubmit={handleAddPayment} className="flex items-end gap-3 mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex-1">
                    <Input
                      label="Montant"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      label="Méthode"
                      value={newPayment.method}
                      onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                    >
                      <option value="virement">Virement</option>
                      <option value="especes">Espèces</option>
                      <option value="cheque">Chèque</option>
                      <option value="traite">Traite</option>
                      <option value="carte">Carte</option>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Date"
                      type="date"
                      value={newPayment.paidAt}
                      onChange={(e) => setNewPayment({ ...newPayment, paidAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <Button type="button" onClick={handleAddPayment} loading={addingPayment}>
                      <FiPlus className="text-sm" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

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
  const { company, billing } = useSettings();
  const currency = billing?.currency || 'MAD';
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [pdfDownloading, setPdfDownloading] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState(null);
  const [emailData, setEmailData] = useState({ recipientEmail: '', subject: '', message: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

  const statusFilterMap = {
    draft: 'brouillon',
    sent: 'envoyé',
    paid: 'payé',
    overdue: 'en_retard',
    cancelled: 'annulé'
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter !== 'all' && { status: statusFilterMap[statusFilter] || statusFilter }),
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

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;
    try {
      await invoiceService.delete(invoiceId);
      fetchInvoices();
      if (window.refreshReports) window.refreshReports();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      const submitData = {
        client: data.client,
        invoiceNumber: data.invoiceNumber,
        date: data.date,
        dueDate: data.dueDate,
        status: data.status,
        lines: data.lines,
        notes: data.notes,
      };
      if (editingInvoice) {
        await invoiceService.update(editingInvoice._id, submitData);
      } else {
        const response = await invoiceService.create(submitData);
        if (response.invoice?.number) {
          alert(`Facture créée avec succès !\nNuméro: ${response.invoice.number}`);
        }
      }
      setShowModal(false);
      fetchInvoices();
      if (window.refreshReports) window.refreshReports();
    } catch (error) {
      console.error('Error saving invoice:', error);
      const msg = error.response?.data?.message || error.response?.data?.errors?.join(', ') || error.message || 'Failed to save invoice';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'brouillon': 'draft',
      'envoyé': 'sent',
      'payé': 'paid',
      'en_retard': 'overdue',
      'annulé': 'cancelled'
    };
    const mappedStatus = statusMap[status] || status;
    
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
    return <Badge variant={variants[mappedStatus]}>{labels[mappedStatus]}</Badge>;
  };

  const generatePDF = async (invoice) => {
    setPdfDownloading(invoice._id);
    try {
      await generateInvoicePDF(invoice, { company, billing });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setPdfDownloading(null);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.recipientEmail) {
      alert('Veuillez entrer une adresse email');
      return;
    }
    setSendingEmail(true);
    try {
      await invoiceService.sendEmail(emailInvoice._id, emailData);
      alert('Email envoyé avec succès');
      setShowEmailModal(false);
      setEmailData({ recipientEmail: '', subject: '', message: '' });
      fetchInvoices();
    } catch (error) {
      console.error('Error sending email:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de l\'envoi de l\'email';
      alert(errorMsg);
    } finally {
      setSendingEmail(false);
    }
  };

  const openEmailModal = (invoice) => {
    setEmailInvoice(invoice);
    setEmailData({
      recipientEmail: invoice.clientId?.email || '',
      subject: `Facture ${invoice.number} - ${company.name || 'Votre Entreprise'}`,
      message: ''
    });
    setShowEmailModal(true);
  };

  const handleDuplicateInvoice = (invoice) => {
    const duplicatedInvoice = {
      ...invoice,
      _id: undefined,
      number: '',
      status: 'brouillon',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
    };
    setEditingInvoice(duplicatedInvoice);
    setShowModal(true);
  };

  const columns = [
    {
      key: 'number',
      header: 'N° Facture',
      render: (row) => <span className="font-semibold text-primary">{row.number}</span>,
    },
    {
      key: 'clientId',
      header: 'Client',
      render: (row) => row.clientId?.companyName || '-',
    },
    {
      key: 'issueDate',
      header: 'Date',
      render: (row) => formatDateShort(row.issueDate),
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      render: (row) => formatDateShort(row.dueDate),
    },
    {
      key: 'totalTTC',
      header: 'Montant',
      render: (row) => formatCurrency(row.totalTTC || 0, currency),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: '',
      width: '200px',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === 'brouillon' && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={async () => {
                if (window.confirm('Finaliser et marquer comme envoyée ?')) {
                  try {
                    await invoiceService.update(row._id, { status: 'sent' });
                    fetchInvoices();
                  } catch (error) {
                    console.error('Error finalizing invoice:', error);
                    alert('Erreur lors de la finalisation');
                  }
                }
              }}
              title="Finaliser"
              className="text-xs"
            >
              Finaliser
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => generatePDF(row)} disabled={pdfDownloading === row._id} title="Télécharger PDF">
            {pdfDownloading === row._id ? <Loading size="sm" /> : <FiDownload className="text-sm" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEmailModal(row)} title="Envoyer par email">
            <FiMail className="text-sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDuplicateInvoice(row)} title="Dupliquer">
            <FiCopy className="text-sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <FiEdit2 className="text-sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row._id)} className="text-red-500 hover:text-red-700">
            <FiTrash2 className="text-sm" />
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
        title={editingInvoice?._id ? 'Modifier la facture' : 'Nouvelle facture'}
        size="xl"
      >
        <InvoiceForm
          invoice={editingInvoice}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={submitting}
          onInvoiceUpdate={(updatedInvoice) => setEditingInvoice(updatedInvoice)}
        />
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title={`Envoyer la facture ${emailInvoice?.number}`}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Email du destinataire"
            value={emailData.recipientEmail}
            onChange={(e) => setEmailData({ ...emailData, recipientEmail: e.target.value })}
            placeholder="client@exemple.com"
            required
          />
          <Input
            label="Objet"
            value={emailData.subject}
            onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message (optionnel)</label>
            <textarea
              value={emailData.message}
              onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
              rows={4}
              placeholder="Message optionnel à inclure dans l'email..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowEmailModal(false)}>Annuler</Button>
            <Button onClick={handleSendEmail} loading={sendingEmail}>
              <FiMail className="text-sm" />
              Envoyer
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

export default Invoices;
