import { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../../components/layout';
import { Card, Button, Input, Select, Loading, Badge, Modal } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { reminderService, invoiceService, expenseService } from '../../services';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { FiCamera, FiMail, FiBell, FiAlertTriangle, FiCheckCircle, FiClock, FiSend, FiRefreshCw, FiDatabase, FiDownload } from 'react-icons/fi';
import api, { BACKEND_URL } from '../../services/api';
import { exportToExcel, exportMultiSheetExcel, formatDateFrench, getFrenchDateFilename } from '../../utils/exportToExcel';

const Settings = () => {
  const { settings, loading: settingsLoading, updateSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [company, setCompany] = useState({
    name: '',
    address: '',
    ice: '',
    rc: '',
    if: '',
    phone: '',
    logoUrl: '',
  });
  const [billing, setBilling] = useState({
    currency: 'MAD',
    vatRate: 20,
    invoiceFormat: 'F-{YYYY}-{0000}',
  });
  const [notifications, setNotifications] = useState({
    firstReminder: 3,
    secondReminder: 7,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFromEmail: '',
    smtpFromName: '',
  });
  const [activeTab, setActiveTab] = useState('company');

  const [notificationStats, setNotificationStats] = useState(null);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!settingsLoading && settings) {
      setCompany(prev => ({ ...prev, ...settings.company }));
      setBilling(prev => ({ ...prev, ...settings.billing }));
      setNotifications(prev => ({ ...prev, ...settings.notifications }));
      setLoading(false);
    }
  }, [settings, settingsLoading]);

  const fetchNotificationData = useCallback(async () => {
    if (activeTab !== 'notifications') return;
    
    setLoadingNotifications(true);
    try {
      const [statsRes, upcomingRes, overdueRes] = await Promise.all([
        reminderService.getStats(),
        reminderService.getUpcoming(),
        invoiceService.getAll({ status: 'en_retard' })
      ]);

      setNotificationStats(statsRes);
      setUpcomingReminders(upcomingRes.data || []);
      
      const overdueData = overdueRes.data || overdueRes;
      setOverdueInvoices(Array.isArray(overdueData) ? overdueData : []);
    } catch (error) {
      console.error('Error fetching notification data:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotificationData();
    }
  }, [activeTab, fetchNotificationData]);

  const handleSendReminders = async () => {
    setShowReminderConfirm(false);
    setSendingReminders(true);
    try {
      const result = await reminderService.sendBatch();
      setSaveMessage({ type: 'success', text: `${result.modifiedCount} rappels envoyés avec succès` });
      await fetchNotificationData();
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Erreur lors de l\'envoi des rappels' });
    } finally {
      setSendingReminders(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.put('/settings', { company, billing, notifications });
      updateSettings({ company, billing, notifications });
      setSaveMessage({ type: 'success', text: 'Modifications enregistrées' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpResult(null);
    try {
      const response = await api.post('/settings/test-smtp', {
        smtpHost: notifications.smtpHost,
        smtpPort: notifications.smtpPort,
        smtpUser: notifications.smtpUser,
        smtpPass: notifications.smtpPass,
        smtpSecure: notifications.smtpSecure
      });
      setSmtpResult(response.data.message || (response.data.success ? 'Connexion réussie' : 'Échec'));
    } catch (error) {
      setSmtpResult('Échec de connexion: ' + (error.response?.data?.message || error.message));
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const response = await api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        setCompany(prev => ({ ...prev, logoUrl: response.data.logoUrl }));
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
    }
  };

  const handleExportData = async (type) => {
    setExporting(true);
    try {
      const [clientsRes, invoicesRes, productsRes, expensesRes] = await Promise.all([
        api.get('/clients', { params: { limit: 10000 } }),
        invoiceService.getAll({ limit: 10000 }),
        api.get('/products', { params: { limit: 10000 } }),
        expenseService.getAll({ limit: 10000 }),
      ]);

      const clients = clientsRes.data?.data || clientsRes.data || [];
      const invoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes.data || []);
      const products = productsRes.data || [];
      const expenses = Array.isArray(expensesRes) ? expensesRes : (expensesRes.data || []);
      const dateStr = getFrenchDateFilename();

      const clientColumns = [
        { header: 'Nom', value: r => r.companyName || r.name || '', width: 25, textType: true },
        { header: 'Email', value: r => r.email || '', width: 30, textType: true },
        { header: 'Téléphone', value: r => r.phone || '', width: 15, textType: true },
        { header: 'Ville', value: r => r.city || r.address || '', width: 15, textType: true },
        { header: 'Pays', value: r => r.country || 'Maroc', width: 12, textType: true },
        { header: 'ICE', value: r => r.ice || '', width: 22, textType: true },
        { header: 'Statut', value: r => r.status || 'actif', width: 12, textType: true },
        { header: 'Total Facturé (MAD)', value: r => r.totalBilled || 0, width: 18 },
        { header: 'Limite Crédit', value: r => r.creditLimit || 0, width: 15 },
        { header: 'Conditions Paiement', value: r => r.paymentTerms || '', width: 20, textType: true },
        { header: 'Date Création', value: r => formatDateFrench(r.createdAt), width: 20, textType: true },
      ];

      const invoiceColumns = [
        { header: 'N° Facture', value: r => r.number || '', width: 15, textType: true },
        { header: 'Client', value: r => r.clientId?.companyName || r.clientName || '', width: 25, textType: true },
        { header: 'Date Émission', value: r => formatDateFrench(r.issueDate || r.createdAt), width: 18, textType: true },
        { header: 'Date Échéance', value: r => formatDateFrench(r.dueDate), width: 18, textType: true },
        { header: 'Sous-total HT (MAD)', value: r => r.subtotal || 0, width: 18 },
        { header: 'TVA (MAD)', value: r => r.vatAmount || 0, width: 14 },
        { header: 'Total TTC (MAD)', value: r => r.totalTTC || 0, width: 16 },
        { header: 'Statut', value: r => r.status || '', width: 12, textType: true },
        { header: 'Conditions Paiement', value: r => r.paymentTerms || '', width: 20, textType: true },
      ];

      const productColumns = [
        { header: 'SKU', value: r => r.sku || r.code || '', width: 15, textType: true },
        { header: 'Nom', value: r => r.name || '', width: 30, textType: true },
        { header: 'Catégorie', value: r => r.category || '', width: 18, textType: true },
        { header: 'Prix HT (MAD)', value: r => r.price || 0, width: 14 },
        { header: 'TVA %', value: r => r.vatRate || 0, width: 10 },
        { header: 'Stock', value: r => r.stock || 0, width: 10 },
        { header: 'Statut', value: r => r.status || '', width: 12, textType: true },
      ];

      const expenseColumns = [
        { header: 'Date', value: r => formatDateFrench(r.date || r.createdAt), width: 15, textType: true },
        { header: 'Description', value: r => r.description || '', width: 35, textType: true },
        { header: 'Catégorie', value: r => r.category || '', width: 18, textType: true },
        { header: 'Fournisseur', value: r => r.supplier || r.vendor || '', width: 22, textType: true },
        { header: 'Montant (MAD)', value: r => r.amount || 0, width: 15 },
        { header: 'Justificatif', value: r => r.attachment ? 'Oui' : 'Non', width: 12, textType: true },
        { header: 'Statut', value: r => r.status || '', width: 12, textType: true },
      ];

      const rightAlignCols = [4, 5, 6, 7, 8];

      switch (type) {
        case 'all':
          exportMultiSheetExcel([
            { name: 'Clients', columns: clientColumns, data: clients, rightAlignCols },
            { name: 'Factures', columns: invoiceColumns, data: invoices, rightAlignCols },
            { name: 'Produits', columns: productColumns, data: products, rightAlignCols: [3, 4, 5] },
            { name: 'Dépenses', columns: expenseColumns, data: expenses, rightAlignCols: [4] },
            { name: 'Résumé', columns: [], data: [] },
          ], `sauvegarde-complete-${dateStr}.xlsx`, {
            clients: clients.length,
            invoices: invoices.length,
            products: products.length,
            expenses: expenses.length,
          });
          break;
        case 'clients':
          exportToExcel(clients, clientColumns, `clients-${dateStr}.xlsx`, 'Clients', [7, 8]);
          break;
        case 'invoices':
          exportToExcel(invoices, invoiceColumns, `factures-${dateStr}.xlsx`, 'Factures', rightAlignCols);
          break;
        case 'products':
          exportToExcel(products, productColumns, `produits-${dateStr}.xlsx`, 'Produits', [3, 4, 5]);
          break;
        case 'expenses':
          exportToExcel(expenses, expenseColumns, `depenses-${dateStr}.xlsx`, 'Dépenses', [4]);
          break;
        default:
          throw new Error('Type invalide');
      }

      setSaveMessage({ type: 'success', text: 'Export terminé avec succès' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setSaveMessage({ type: 'error', text: 'Erreur lors de l\'export' });
    } finally {
      setExporting(false);
    }
  };

  const getReminderTypeLabel = (type) => {
    const labels = {
      payment: 'Paiement',
      followup: 'Relance',
      renewal: 'Renouvellement'
    };
    return labels[type] || type;
  };

  const getReminderTypeColor = (type) => {
    const colors = {
      payment: 'bg-red-100 text-red-700',
      followup: 'bg-blue-100 text-blue-700',
      renewal: 'bg-purple-100 text-purple-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <PageLayout title="Paramètres Système">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Paramètres Système">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="flex gap-8">
            {['company', 'billing', 'notifications', 'backup'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'company' ? 'Infos Entreprise' : tab === 'billing' ? 'Facturation' : tab === 'notifications' ? 'Notifications' : 'Sauvegarde'}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'company' && (
          <Card title="Informations de l'Entreprise">
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  {company.logoUrl ? (
                    <img src={company.logoUrl.startsWith('http') ? company.logoUrl : `${BACKEND_URL}${company.logoUrl}`} alt="Logo" className="size-24 rounded-lg object-contain border border-slate-200" />
                  ) : (
                    <div className="size-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                      <FiCamera className="text-slate-400 text-3xl" />
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={(e) => handleLogoUpload(e.target.files[0])} />
                  <label htmlFor="logo-upload" className="absolute bottom-0 right-0 cursor-pointer bg-primary text-white rounded-full p-1">
                    <FiCamera size={12} />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-bold mb-1">Logo de l'entreprise</p>
                  <p className="text-xs text-slate-500">PNG, JPG jusqu'à 2Mo. Recommandé : 400x400px.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nom de l'entreprise" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
                <Input label="Téléphone" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
                <Input label="Adresse" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} className="md:col-span-2" />
                <Input label="ICE" value={company.ice} onChange={(e) => setCompany({ ...company, ice: e.target.value })} />
                <Input label="RC" value={company.rc} onChange={(e) => setCompany({ ...company, rc: e.target.value })} />
                <Input label="IF" value={company.if} onChange={(e) => setCompany({ ...company, if: e.target.value })} />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'billing' && (
          <Card title="Configuration de Facturation">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select label="Devise par défaut" value={billing.currency} onChange={(e) => setBilling({ ...billing, currency: e.target.value })}>
                <option value="MAD">MAD - Dirham Marocain</option>
              </Select>
              <Input label="TVA par défaut (%)" type="number" value={billing.vatRate} onChange={(e) => setBilling({ ...billing, vatRate: e.target.value })} />
              <Input label="Format Numéro" value={billing.invoiceFormat} onChange={(e) => setBilling({ ...billing, invoiceFormat: e.target.value })} />
            </div>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card title="Tableau de Bord des Notifications">
              {loadingNotifications ? (
                <div className="flex items-center justify-center py-8">
                  <Loading size="md" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                          <FiClock className="text-amber-600 text-lg" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                            {notificationStats?.byStatus?.pending || 0}
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-500">En attente</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <FiCheckCircle className="text-emerald-600 text-lg" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                            {notificationStats?.byStatus?.sent || 0}
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500">Envoyés</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                          <FiAlertTriangle className="text-red-600 text-lg" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                            {notificationStats?.overdueInvoices || 0}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-500">Factures en retard</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <FiBell className="text-blue-600 text-lg" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                            {upcomingReminders.length}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-500">7 prochains jours</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                        Rappels à venir (7 jours)
                      </h4>
                      <Button 
                        size="sm" 
                        onClick={() => setShowReminderConfirm(true)}
                        loading={sendingReminders}
                        disabled={upcomingReminders.length === 0}
                      >
                        <FiSend className="text-sm" />
                        Envoyer les rappels
                      </Button>
                    </div>

                    {upcomingReminders.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <FiCheckCircle className="mx-auto text-3xl mb-2 text-emerald-500" />
                        <p>Aucun rappel programmé pour les 7 prochains jours</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingReminders.map((reminder) => (
                          <div key={reminder._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-4">
                              <div className={`px-2 py-1 rounded text-xs font-medium ${getReminderTypeColor(reminder.type)}`}>
                                {getReminderTypeLabel(reminder.type)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-700 dark:text-slate-300">
                                  {reminder.clientId?.companyName || 'Client'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {reminder.invoiceId?.number} - {formatCurrency(reminder.invoiceId?.totalTTC || 0)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {formatDate(reminder.scheduledDate)}
                              </p>
                              <p className="text-xs text-slate-500">
                                dans {Math.ceil((new Date(reminder.scheduledDate) - new Date()) / (1000 * 60 * 60 * 24))} jour(s)
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {overdueInvoices.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">
                        Factures en retard ({overdueInvoices.length})
                      </h4>
                      <div className="space-y-2">
                        {overdueInvoices.slice(0, 5).map((invoice) => (
                          <div key={invoice._id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <div>
                              <p className="font-medium text-red-700 dark:text-red-400">
                                {invoice.number}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-500">
                                Échéance: {formatDate(invoice.dueDate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-700 dark:text-red-400">
                                {formatCurrency(invoice.remainingAmount || invoice.totalTTC)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card title="Configuration SMTP">
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3 text-primary mb-2">
                    <FiMail />
                    <p className="text-sm font-bold">Configuration du serveur email</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Utilisé pour l'envoi des factures et rappels automatiques.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input 
                      label="Serveur SMTP"
                      placeholder="smtp.mon-serveur.com" 
                      value={notifications.smtpHost} 
                      onChange={(e) => setNotifications({ ...notifications, smtpHost: e.target.value })} 
                    />
                    <Input 
                      label="Port SMTP"
                      type="number"
                      placeholder="587" 
                      value={notifications.smtpPort} 
                      onChange={(e) => setNotifications({ ...notifications, smtpPort: parseInt(e.target.value) || 587 })} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input 
                      label="Utilisateur SMTP"
                      placeholder="email@exemple.com" 
                      value={notifications.smtpUser} 
                      onChange={(e) => setNotifications({ ...notifications, smtpUser: e.target.value })} 
                    />
                    <Input 
                      label="Mot de passe SMTP"
                      type="password"
                      placeholder="••••••••" 
                      value={notifications.smtpPass} 
                      onChange={(e) => setNotifications({ ...notifications, smtpPass: e.target.value })} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input 
                      label="Email d'envoi (From)"
                      placeholder="noreply@exemple.com" 
                      value={notifications.smtpFromEmail} 
                      onChange={(e) => setNotifications({ ...notifications, smtpFromEmail: e.target.value })} 
                    />
                    <Input 
                      label="Nom d'envoi (From Name)"
                      placeholder="Nom de l'entreprise" 
                      value={notifications.smtpFromName} 
                      onChange={(e) => setNotifications({ ...notifications, smtpFromName: e.target.value })} 
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={notifications.smtpSecure || false}
                      onChange={(e) => setNotifications({ ...notifications, smtpSecure: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <label htmlFor="smtpSecure" className="text-sm text-slate-600 dark:text-slate-400">
                      Utiliser SSL/TLS (port 465)
                    </label>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button onClick={handleTestSmtp} disabled={testingSmtp}>
                      {testingSmtp ? 'Test...' : 'Tester la connexion'}
                    </Button>
                  </div>
                  {smtpResult && (
                    <p className={`text-sm mt-2 ${smtpResult.includes('réussie') || smtpResult.includes('succès') ? 'text-green-600' : 'text-red-600'}`}>
                      {smtpResult}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Jours de Rappel">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm mb-2">Premier rappel (jours après échéance)</p>
                  <Input 
                    type="number" 
                    value={notifications.firstReminder} 
                    onChange={(e) => setNotifications({ ...notifications, firstReminder: e.target.value })} 
                  />
                </div>
                <div>
                  <p className="text-sm mb-2">Deuxième rappel (jours après échéance)</p>
                  <Input 
                    type="number" 
                    value={notifications.secondReminder} 
                    onChange={(e) => setNotifications({ ...notifications, secondReminder: e.target.value })} 
                  />
                </div>
              </div>
            </Card>

            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={fetchNotificationData}>
                <FiRefreshCw className="text-sm" />
                Actualiser
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <Card title="Export des Données">
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <FiDatabase className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">Sauvegarde des données</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                        Exportez vos données au format Excel (.xlsx) pour une sauvegarde complète ou partielle.
                        Ces fichiers sont compatibles avec Excel et peuvent être utilisés pour archiver ou analyser vos données.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FiDownload className="text-primary" />
                      </div>
                      <p className="font-medium">Sauvegarde complète</p>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Export de toutes les données (clients, factures, produits, dépenses)
                    </p>
                    <Button onClick={() => handleExportData('all')} loading={exporting} className="w-full">
                      <FiDownload className="text-sm" />
                      Exporter tout
                    </Button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <FiDatabase className="text-emerald-600" />
                      </div>
                      <p className="font-medium">Clients uniquement</p>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Export de la liste des clients avec leurs informations
                    </p>
                    <Button variant="secondary" onClick={() => handleExportData('clients')} loading={exporting} className="w-full">
                      <FiDownload className="text-sm" />
                      Exporter clients
                    </Button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FiDatabase className="text-blue-600" />
                      </div>
                      <p className="font-medium">Factures uniquement</p>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Export de toutes les factures et paiements
                    </p>
                    <Button variant="secondary" onClick={() => handleExportData('invoices')} loading={exporting} className="w-full">
                      <FiDownload className="text-sm" />
                      Exporter factures
                    </Button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <FiDatabase className="text-amber-600" />
                      </div>
                      <p className="font-medium">Produits uniquement</p>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Export du catalogue produits et services
                    </p>
                    <Button variant="secondary" onClick={() => handleExportData('products')} loading={exporting} className="w-full">
                      <FiDownload className="text-sm" />
                      Exporter produits
                    </Button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <FiDatabase className="text-red-600" />
                      </div>
                      <p className="font-medium">Dépenses uniquement</p>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Export de toutes les dépenses enregistrées
                    </p>
                    <Button variant="secondary" onClick={() => handleExportData('expenses')} loading={exporting} className="w-full">
                      <FiDownload className="text-sm" />
                      Exporter dépenses
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Avertissements">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <FiAlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Export régulier recommandé</p>
                    <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                      Nous vous recommandons d'exporter vos données régulièrement pour éviter toute perte.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <FiDatabase className="text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">Format Excel (.xlsx)</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      Les exports sont au format Excel, compatibles avec Microsoft Excel, Google Sheets et autres tableurs.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button variant="secondary">Réinitialiser</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
        {saveMessage && (
          <p className={`text-sm text-right ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {saveMessage.text}
          </p>
        )}

        <Modal isOpen={showReminderConfirm} onClose={() => setShowReminderConfirm(false)} title="Confirmer l'envoi des rappels">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <FiAlertTriangle className="text-amber-500 text-xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Cette action est irréversible
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {upcomingReminders.length} rappel(s) seront marqués comme envoyés. Cette action ne peut pas être annulée.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Les rappels suivants seront envoyés :
            </p>
            <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1 max-h-40 overflow-y-auto">
              {upcomingReminders.slice(0, 5).map((reminder) => (
                <li key={reminder._id} className="flex justify-between">
                  <span>{reminder.clientId?.companyName || 'Client'}</span>
                  <span className="text-slate-400">{formatDate(reminder.scheduledDate)}</span>
                </li>
              ))}
              {upcomingReminders.length > 5 && (
                <li className="text-slate-400 italic">
                  ...et {upcomingReminders.length - 5} autre(s)
                </li>
              )}
            </ul>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowReminderConfirm(false)}>
                Annuler
              </Button>
              <Button onClick={handleSendReminders} loading={sendingReminders}>
                <FiSend className="text-sm" />
                Confirmer l'envoi
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageLayout>
  );
};

export default Settings;
