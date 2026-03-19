import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Card, Button, Input, Select, Loading } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { FiCamera, FiMail } from 'react-icons/fi';
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

  useEffect(() => {
    if (!settingsLoading && settings) {
      setCompany(prev => ({ ...prev, ...settings.company }));
      setBilling(prev => ({ ...prev, ...settings.billing }));
      setNotifications(prev => ({ ...prev, ...settings.notifications }));
      setLoading(false);
    }
  }, [settings, settingsLoading]);

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
      <div className="max-w-4xl mx-auto space-y-8">
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
          <Card title="Alertes & Notifications">
            <div className="space-y-6">
              <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <FiMail />
                  <p className="text-sm font-bold">Configuration SMTP</p>
                </div>
                <p className="text-xs text-slate-500 mb-3">Utilisé pour l'envoi des factures et rappels automatiques.</p>
                <div className="flex gap-4">
                  <Input placeholder="smtp.mon-serveur.com" value={notifications.smtpHost} onChange={(e) => setNotifications({ ...notifications, smtpHost: e.target.value })} className="flex-1" />
                  <Button onClick={handleTestSmtp} disabled={testingSmtp}>{testingSmtp ? 'Test...' : 'Tester'}</Button>
                </div>
                {smtpResult && (
                  <p className={`text-sm mt-2 ${smtpResult.includes('réussie') ? 'text-green-600' : 'text-red-600'}`}>
                    {smtpResult}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm mb-2">Premier rappel (jours après échéance)</p>
                  <Input type="number" value={notifications.firstReminder} onChange={(e) => setNotifications({ ...notifications, firstReminder: e.target.value })} />
                </div>
                <div>
                  <p className="text-sm mb-2">Deuxième rappel (jours après échéance)</p>
                  <Input type="number" value={notifications.secondReminder} onChange={(e) => setNotifications({ ...notifications, secondReminder: e.target.value })} />
                </div>
              </div>
            </div>
          </Card>
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
