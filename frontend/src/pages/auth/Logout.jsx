import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui';

const Logout = () => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(true);

  useEffect(() => {
    const performLogout = async () => {
      try {
        if (isAuthenticated) {
          await logout();
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setIsLoggingOut(false);
        navigate('/login');
      }
    };

    performLogout();
  }, [logout, navigate, isAuthenticated]);

  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <Loading size="lg" className="mb-4" />
          <p className="text-slate-500">Déconnexion en cours...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Logout;
