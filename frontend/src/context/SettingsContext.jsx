import { createContext, useContext, useState, useEffect, createContext as createReactContext } from 'react';
import api from '../services/api';

const SettingsContext = createReactContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    company: {
      name: '',
      address: '',
      ice: '',
      rc: '',
      if: '',
      phone: '',
      logoUrl: '',
    },
    billing: {
      currency: 'MAD',
      vatRate: 20,
      invoiceFormat: 'F-{YYYY}-{0000}',
    },
    notifications: {
      firstReminder: 3,
      secondReminder: 7,
      smtpHost: '',
    },
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const value = {
    settings,
    loading,
    updateSettings,
    refreshSettings: fetchSettings,
    company: settings.company,
    billing: settings.billing,
    notifications: settings.notifications,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
