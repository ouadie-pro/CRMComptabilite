import { useState } from 'react';
import { PageLayout } from '../../components/layout';
import { Card, Button, Input, Select } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { FiCamera, FiMail } from 'react-icons/fi';

const Settings = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState({
    name: 'Expertise Comptable S.A.R.L',
    address: '123 Boulevard Zerktouni, Casablanca',
    ice: '001234567890123',
    rc: 'CAS-12345',
    if: '45678912',
    phone: '+212 5 22 00 00 00',
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

  const handleSave = () => {
    console.log('Saving settings...');
  };

  return (
    <PageLayout title="Paramètres Système">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Tabs */}
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

        {/* Company Info */}
        {activeTab === 'company' && (
          <Card title="Informations de l'Entreprise">
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="size-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                  <FiCamera className="text-slate-400 text-3xl" />
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

        {/* Billing */}
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

        {/* Notifications */}
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
                  <Button>Tester</Button>
                </div>
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

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="secondary">Réinitialiser</Button>
          <Button onClick={handleSave}>Enregistrer les modifications</Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;
