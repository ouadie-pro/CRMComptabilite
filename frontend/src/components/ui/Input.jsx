export const Input = ({ 
  label, 
  error, 
  icon,
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full rounded-lg border border-slate-300 dark:border-slate-700 
            bg-white dark:bg-slate-800 text-slate-900 dark:text-white 
            focus:ring-2 focus:ring-primary focus:border-transparent 
            transition-all outline-none py-2 px-3 md:py-2.5 md:px-4 text-sm md:text-base
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export const Select = ({ 
  label, 
  error, 
  children,
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        className={`
          w-full rounded-lg border border-slate-300 dark:border-slate-700 
          bg-white dark:bg-slate-800 text-slate-900 dark:text-white 
          focus:ring-2 focus:ring-primary focus:border-transparent 
          transition-all outline-none py-2 px-3 md:py-2.5 md:px-4 text-sm md:text-base
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export const Textarea = ({ 
  label, 
  error, 
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full rounded-lg border border-slate-300 dark:border-slate-700 
          bg-white dark:bg-slate-800 text-slate-900 dark:text-white 
          focus:ring-2 focus:ring-primary focus:border-transparent 
          transition-all outline-none py-2 px-3 md:py-2.5 md:px-4 text-sm md:text-base
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
