import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FiMenu } from 'react-icons/fi';

export const Layout = ({ title, actions, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-50 h-full transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} actions={actions} onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};

export const PageLayout = ({ title, actions, children }) => {
  return <Layout title={title} actions={actions}>{children}</Layout>;
};
