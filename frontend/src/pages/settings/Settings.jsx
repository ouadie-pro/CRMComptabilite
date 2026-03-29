import { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../../components/layout';
import { Card, Button, Input, Select, Loading, Badge } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { reminderService, invoiceService } from '../../services';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { FiCamera, FiMail, FiBell, FiAlertTriangle, FiCheckCircle, FiClock, FiSend, FiRefreshCw } from 'react-icons/fi';
import api, { BACKEND_URL } from '../../services/api';

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
  });
  const [activeTab, setActiveTab] = useState('company');

  const [notificationStats, setNotificationStats] = useState(null);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

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
      const response = await api.post('/settings/test-smtp', { smtpHost: notifications.smtpHost });
      setSmtpResult(response.data.message);
    } catch {
      setSmtpResult('Échec de connexion');
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
            {['company', 'billing', 'notifications'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'company' ? 'Infos Entreprise' : tab === 'billing' ? 'Facturation' : 'Notifications'}
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
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dollar US</option>
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
                        onClick={handleSendReminders}
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
                  <div className="flex gap-4">
                    <Input 
                      placeholder="smtp.mon-serveur.com" 
                      value={notifications.smtpHost} 
                      onChange={(e) => setNotifications({ ...notifications, smtpHost: e.target.value })} 
                      className="flex-1" 
                    />
                    <Button onClick={handleTestSmtp} disabled={testingSmtp}>
                      {testingSmtp ? 'Test...' : 'Tester'}
                    </Button>
                  </div>
                  {smtpResult && (
                    <p className={`text-sm mt-2 ${smtpResult.includes('réussie') ? 'text-green-600' : 'text-red-600'}`}>
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
      </div>
    </PageLayout>
  );
};

export default Settings;
