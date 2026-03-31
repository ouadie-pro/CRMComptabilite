import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/formatters';
import { FiBriefcase, FiGrid, FiUsers, FiFileText, FiPackage, FiDollarSign, FiBarChart2, FiClipboard, FiSettings, FiLogOut, FiX, FiMessageSquare, FiUserCheck } from 'react-icons/fi';

const adminNavItems = [
  { path: '/dashboard', icon: FiGrid, label: 'Tableau de bord' },
  { path: '/clients', icon: FiUsers, label: 'Clients' },
  { path: '/invoices', icon: FiFileText, label: 'Factures' },
  { path: '/products', icon: FiPackage, label: 'Produits' },
  { path: '/expenses', icon: FiDollarSign, label: 'Dépenses' },
  { path: '/interactions', icon: FiMessageSquare, label: 'Interactions' },
  { path: '/reports', icon: FiBarChart2, label: 'Rapports' },
  { path: '/users', icon: FiUserCheck, label: 'Utilisateurs' },
  { path: '/audit', icon: FiClipboard, label: 'Audit' },
  { path: '/settings', icon: FiSettings, label: 'Paramètres' },
];

const comptableNavItems = [
  { path: '/comptable/dashboard', icon: FiGrid, label: 'Dashboard' },
  { path: '/comptable/caisse', icon: FiDollarSign, label: 'Caisse' },
  { path: '/invoices', icon: FiFileText, label: 'Factures' },
  { path: '/expenses', icon: FiDollarSign, label: 'Dépenses' },
  { path: '/reports', icon: FiBarChart2, label: 'Rapports financiers' },
];

export const Sidebar = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const navItems = user?.role === 'comptable' ? comptableNavItems : adminNavItems;
  const defaultPath = user?.role === 'comptable' ? '/comptable/dashboard' : '/dashboard';

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
          <FiBriefcase />
        </div>
        <div className="flex-1">
          <h1 className="text-primary dark:text-white text-base font-bold leading-tight">CRM Comptabilité</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Gestion Financière</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-slate-500 hover:text-slate-700">
            <FiX className="text-xl" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-primary/10'
              }`
            }
          >
            <item.icon />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
            {getInitials(user?.name || user?.email)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role || 'Utilisateur'}</p>
          </div>
          <button
            onClick={() => navigate('/logout')}
            className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
          >
            <FiLogOut className="text-lg" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
