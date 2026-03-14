import { useState, useEffect } from 'react';
import { PageLayout } from '../../components/layout';
import { Button, Input, Select, DataTable, Modal, Badge, Loading } from '../../components/ui';
import { productService } from '../../services';
import { formatCurrency } from '../../utils/formatters';
import { FiEdit2, FiPlus, FiSearch } from 'react-icons/fi';

const ProductForm = ({ product, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    category: product?.category || 'service',
    price: product?.price || '',
    cost: product?.cost || '',
    vatRate: product?.vatRate || 20,
    unit: product?.unit || 'unit',
    status: product?.status || 'active',
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nom du produit"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <Input
          label="SKU / Référence"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          placeholder="PRD-001"
        />
      </div>
      <Input
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Catégorie"
          name="category"
          value={formData.category}
          onChange={handleChange}
        >
          <option value="product">Matériel</option>
          <option value="service">Service</option>
          <option value="license">Licence</option>
        </Select>
        <Input
          label="Prix HT"
          name="price"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={handleChange}
        />
        <Input
          label="Coût"
          name="cost"
          type="number"
          step="0.01"
          value={formData.cost}
          onChange={handleChange}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="TVA"
          name="vatRate"
          value={formData.vatRate}
          onChange={handleChange}
        >
          <option value={0}>0%</option>
          <option value={5.5}>5.5%</option>
          <option value={10}>10%</option>
          <option value={20}>20%</option>
        </Select>
        <Input
          label="Unité"
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          placeholder="unité, heure, kg..."
        />
        <Select
          label="Statut"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </Select>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const categoryFilterMap = {
    product: 'matériel',
    service: 'service',
    license: 'licence'
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        ...(search && { search }),
        ...(categoryFilter !== 'all' && { category: categoryFilterMap[categoryFilter] || categoryFilter }),
      };
      const response = await productService.getAll(params);
      setProducts(response.data || response);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter]);

  const handleCreate = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingProduct) {
        await productService.update(editingProduct._id, data);
      } else {
        await productService.create(data);
      }
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      render: (row) => <span className="font-mono text-xs">{row.sku}</span>,
    },
    {
      key: 'name',
      header: 'Nom',
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'category',
      header: 'Catégorie',
      render: (row) => {
        const colors = { matériel: 'info', service: 'warning', license: 'primary' };
        return <Badge variant={colors[row.category]}>{row.category === 'matériel' ? 'Matériel' : row.category === 'service' ? 'Service' : row.category === 'licence' ? 'Licence' : row.category}</Badge>;
      },
    },
    {
      key: 'priceHT',
      header: 'Prix HT',
      render: (row) => formatCurrency(row.priceHT || 0),
    },
    {
      key: 'vatRate',
      header: 'TVA',
      render: (row) => `${row.vatRate || 0}%`,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => <Badge variant={row.status === 'actif' ? 'success' : 'default'}>{row.status === 'actif' ? 'Actif' : 'Inactif'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
          <FiEdit2 className="text-sm" />
        </Button>
      ),
    },
  ];

  return (
    <PageLayout
      title="Produits & Services"
      actions={
        <Button onClick={handleCreate}>
          <FiPlus />
          Ajouter un Produit
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex gap-4">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">Toutes catégories</option>
            <option value="product">Matériel</option>
            <option value="service">Service</option>
            <option value="license">Licence</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loading size="lg" /></div>
        ) : (
          <DataTable columns={columns} data={products} emptyMessage="Aucun produit trouvé" />
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
      >
        <ProductForm
          product={editingProduct}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
          loading={submitting}
        />
      </Modal>
    </PageLayout>
  );
};

export default Products;
