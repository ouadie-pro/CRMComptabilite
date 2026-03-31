import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading } from '../../components/ui';
import { userService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getInitials } from '../../utils/formatters';
import { FiEdit2, FiTrash2, FiPlus, FiUserPlus, FiKey, FiShield } from 'react-icons/fi';

const UserForm = ({ user, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'comptable',
  });
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'password') setPasswordError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!user && !formData.password) {
      setPasswordError('Le mot de passe est requis');
      return;
    }
    
    if (formData.password && formData.password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nom complet"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <Input
        label={user ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        required={!user}
      />
      {passwordError && (
        <p className="text-sm text-red-600">{passwordError}</p>
      )}
      <Select
        label="Rôle"
        name="role"
        value={formData.role}
        onChange={handleChange}
      >
        <option value="admin">Administrateur</option>
        <option value="directeur">Directeur</option>
        <option value="comptable">Comptable</option>
      </Select>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>
          {user ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getAll();
      setUsers(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser?._id) {
      alert('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await userService.delete(userId);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingUser) {
        const payload = {
          name: data.name,
          email: data.email,
          role: data.role,
        };
        if (data.password) {
          payload.password = data.password;
        }
        await userService.update(editingUser._id, payload);
      } else {
        await userService.register(data);
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setPasswordLoading(true);
    try {
      await userService.resetPassword(passwordUser._id, newPassword);
      alert('Mot de passe réinitialisé avec succès');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setPasswordLoading(false);
    }
  };

  const openPasswordModal = (user) => {
    setPasswordUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const getRoleBadge = (role) => {
    const variants = {
      admin: 'danger',
      directeur: 'warning',
      comptable: 'primary',
    };
    const labels = {
      admin: 'Administrateur',
      directeur: 'Directeur',
      comptable: 'Comptable',
    };
    return <Badge variant={variants[role]}>{labels[role]}</Badge>;
  };

  const columns = [
    {
      key: 'name',
      header: 'Utilisateur',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
            {getInitials(row.name)}
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      render: (row) => getRoleBadge(row.role),
    },
    {
      key: 'lastLogin',
      header: 'Dernière connexion',
      render: (row) => row.lastLogin ? formatDate(row.lastLogin) : 'Jamais',
    },
    {
      key: 'createdAt',
      header: 'Créé le',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      render: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openPasswordModal(row)} title="Réinitialiser mot de passe">
            <FiKey className="text-sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <FiEdit2 className="text-sm" />
          </Button>
          {row._id !== currentUser?._id && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(row._id)} className="text-red-500 hover:text-red-700">
              <FiTrash2 className="text-sm" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'directeur') {
    return (
      <PageLayout title="Utilisateurs">
        <div className="text-center py-12">
          <FiShield className="mx-auto text-4xl text-slate-300 mb-4" />
          <p className="text-slate-500">Vous n'avez pas les droits pour accéder à cette page.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Utilisateurs"
      actions={
        currentUser?.role === 'admin' && (
          <Button onClick={handleCreate}>
            <FiUserPlus />
            Nouvel Utilisateur
          </Button>
        )
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FiShield className="text-blue-600 text-lg" />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Total Utilisateurs</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <FiShield className="text-emerald-600 text-lg" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Administrateurs</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{users.filter(u => u.role === 'admin').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <FiShield className="text-amber-600 text-lg" />
              </div>
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400">Comptables</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{users.filter(u => u.role === 'comptable').length}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : (
          <DataTable columns={columns} data={users} emptyMessage="Aucun utilisateur" />
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        size="lg"
      >
        <UserForm
          user={editingUser}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={submitting}
        />
      </Modal>

      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={`Réinitialiser le mot de passe de ${passwordUser?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 caractères"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowPasswordModal(false)}>Annuler</Button>
            <Button onClick={handleResetPassword} loading={passwordLoading}>
              <FiKey className="text-sm" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

export default Users;
