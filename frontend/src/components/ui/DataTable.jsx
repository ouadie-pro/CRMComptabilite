import { useState } from 'react';
import { Loading } from './Card';
import { FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export const DataTable = ({ 
  columns = [], 
  data = [], 
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  pagination,
  actions,
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (column) => {
    if (!column.sortable) return;
    
    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * modifier;
    }
    return String(aVal || '').localeCompare(String(bVal || '')) * modifier;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-3 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider text-slate-500
                    ${column.sortable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''}
                    ${column.className || ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    {column.header}
                    {column.sortable && sortColumn === column.key && (
                      <span className="text-sm">
                        {sortDirection === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 md:px-6 py-8 md:py-12">
                  <div className="flex justify-center">
                    <Loading />
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 md:px-6 py-8 md:py-12 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => (
                <tr
                  key={row._id || rowIndex}
                  className={`
                    hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 md:px-6 py-3 md:py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap ${column.className || ''}`}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className="px-3 md:px-6 py-3 md:py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs md:text-sm text-slate-500">
            {pagination.total > 0 && `Affichage de ${pagination.page * pagination.limit - pagination.limit + 1} à ${Math.min(pagination.page * pagination.limit, pagination.total)} sur ${pagination.total}`}
          </p>
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1 md:p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FiChevronLeft className="text-sm" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => pagination.onPageChange(page)}
                className={`px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium ${
                  page === pagination.page
                    ? 'bg-primary text-white'
                    : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-1 md:p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FiChevronRight className="text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
