import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout';
import { Card, Badge, Loading, Input } from '../../components/ui';
import { clientService, invoiceService, productService } from '../../services';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { FiSearch, FiUser, FiFileText, FiPackage, FiArrowRight } from 'react-icons/fi';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    clients: [],
    invoices: [],
    products: []
  });
  const [searchInput, setSearchInput] = useState(query);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (query) {
      setSearchInput(query);
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      const [clientsRes, invoicesRes, productsRes] = await Promise.all([
        clientService.getAll({ search: searchQuery }),
        invoiceService.getAll({ search: searchQuery }),
        productService.getAll({ search: searchQuery })
      ]);

      const clientsData = Array.isArray(clientsRes) ? clientsRes : (clientsRes.data || []);
      const invoicesData = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes.data || []);
      const productsData = Array.isArray(productsRes) ? productsRes : (productsRes.data || []);

      setResults({
        clients: clientsData.slice(0, 5),
        invoices: invoicesData.slice(0, 5),
        products: productsData.slice(0, 5)
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchInput.trim())}`;
    }
  };

  const totalResults = results.clients.length + results.invoices.length + results.products.length;

  return (
    <PageLayout title="Recherche">
      <div className="max-w-4xl mx-auto space-y-6">
        <form onSubmit={handleSearch} className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
          <input
            type="text"
            placeholder="Rechercher des clients, factures, produits..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Rechercher
          </button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : hasSearched ? (
          <div className="space-y-6">
            {query && (
              <p className="text-slate-500">
                {totalResults === 0 
                  ? `Aucun résultat pour "${query}"`
                  : `${totalResults} résultat${totalResults > 1 ? 's' : ''} pour "${query}"`
                }
              </p>
            )}

            {results.clients.length > 0 && (
              <Card title={`Clients (${results.clients.length})`}>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {results.clients.map((client) => (
                    <Link
                      key={client._id}
                      to={`/clients/${client._id}`}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FiUser className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{client.companyName}</p>
                          <p className="text-sm text-slate-500">{client.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={client.status === 'actif' ? 'success' : 'default'}>
                          {client.status === 'actif' ? 'Actif' : client.status}
                        </Badge>
                        <FiArrowRight className="text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
                {results.clients.length === 5 && (
                  <Link to={`/clients?search=${encodeURIComponent(query)}`} className="block text-center py-3 text-sm text-primary hover:underline">
                    Voir tous les clients
                  </Link>
                )}
              </Card>
            )}

            {results.invoices.length > 0 && (
              <Card title={`Factures (${results.invoices.length})`}>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {results.invoices.map((invoice) => (
                    <Link
                      key={invoice._id}
                      to={`/invoices?id=${invoice._id}`}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <FiFileText className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.number || 'Facture'}</p>
                          <p className="text-sm text-slate-500">
                            {invoice.clientId?.companyName || 'Client'} • {formatDateShort(invoice.issueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">{formatCurrency(invoice.totalTTC || 0)}</span>
                        <Badge variant={invoice.status === 'payé' ? 'success' : invoice.status === 'en_retard' ? 'danger' : 'warning'}>
                          {invoice.status === 'payé' ? 'Payé' : invoice.status === 'en_retard' ? 'En retard' : invoice.status}
                        </Badge>
                        <FiArrowRight className="text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
                {results.invoices.length === 5 && (
                  <Link to={`/invoices?search=${encodeURIComponent(query)}`} className="block text-center py-3 text-sm text-primary hover:underline">
                    Voir toutes les factures
                  </Link>
                )}
              </Card>
            )}

            {results.products.length > 0 && (
              <Card title={`Produits (${results.products.length})`}>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {results.products.map((product) => (
                    <Link
                      key={product._id}
                      to={`/products`}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                          <FiPackage className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-slate-500">{product.sku}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">{formatCurrency(product.priceHT || product.price || 0)}</span>
                        <Badge variant={product.status === 'actif' ? 'success' : 'default'}>
                          {product.status === 'actif' ? 'Actif' : product.status}
                        </Badge>
                        <FiArrowRight className="text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {totalResults === 0 && query && (
              <div className="text-center py-12">
                <FiSearch className="mx-auto text-5xl text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-lg text-slate-500 mb-2">Aucun résultat trouvé</p>
                <p className="text-slate-400">Essayez avec d'autres mots-clés</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <FiSearch className="mx-auto text-5xl text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg text-slate-500">Entrez un terme de recherche</p>
            <p className="text-slate-400">Recherchez des clients, factures ou produits</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Search;
