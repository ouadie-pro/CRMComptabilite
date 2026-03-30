import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import { FiBriefcase, FiArrowRight, FiMail } from 'react-icons/fi';
import api from '../../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login, isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const role = user?.role;
      if (role === 'comptable') {
        navigate('/comptable/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, authLoading, navigate, user]);

  if (authLoading) {
    return null;
  }

  if (isAuthenticated) {
    const redirectPath = user?.role === 'comptable' ? '/comptable/dashboard' : '/dashboard';
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300 mb-4">Vous êtes déjà connecté</p>
          <Button onClick={() => navigate(redirectPath)}>
            Aller au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      const userRole = response.user?.role;
      if (userRole === 'comptable') {
        navigate('/comptable/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage('');
    try {
      const response = await api.post('/users/forgot-password', { email: forgotEmail });
      setForgotMessage(response.data.message);
      setForgotEmail('');
    } catch (err) {
      setForgotMessage(err.response?.data?.message || 'Erreur lors de la demande de réinitialisation');
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="bg-primary/10 text-primary p-3 rounded-xl inline-flex mb-4">
                <FiMail className="text-2xl" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mot de passe oublié</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Entrez votre adresse email pour recevoir un lien de réinitialisation
              </p>
            </div>

            {forgotMessage && (
              <div className={`p-3 rounded-lg text-sm mb-4 ${forgotMessage.includes('Erreur') || forgotMessage.includes('error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {forgotMessage}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                label="Adresse Email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
              <Button type="submit" className="w-full" loading={forgotLoading}>
                Envoyer le lien
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgot(false)}
                className="text-sm text-primary hover:underline"
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark">
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none overflow-hidden opacity-50 dark:opacity-20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 md:mb-10">
          <div className="bg-primary text-white p-3 rounded-xl shadow-lg mb-4">
            <FiBriefcase className="text-3xl md:text-4xl" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary dark:text-slate-100">CRM Comptabilité</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-center">Gestion financière simplifiée</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Connexion</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Accédez à votre espace comptable sécurisé</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Adresse Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@gmail.com"
                required
              />

              <div className="space-y-1.5">
                <Input
                  label="Mot de passe"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm font-semibold text-primary dark:text-primary/80 hover:underline block text-right w-full"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                Se connecter
                <FiArrowRight className="text-lg" />
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Vous n'avez pas encore de compte ? 
                <a className="text-primary font-bold hover:underline" href="#">Contactez votre administrateur</a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center gap-6">
            <a className="text-xs text-slate-400 hover:text-primary transition-colors" href="#">Aide</a>
            <a className="text-xs text-slate-400 hover:text-primary transition-colors" href="#">Confidentialité</a>
            <a className="text-xs text-slate-400 hover:text-primary transition-colors" href="#">Sécurité</a>
          </div>
          <p className="text-xs text-slate-400">© 2024 CRM Comptabilité SAS. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
