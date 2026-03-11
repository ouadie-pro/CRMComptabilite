import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout = ({ title, actions, children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} actions={actions} />
        <div className="flex-1 overflow-y-auto p-8">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};

export const PageLayout = ({ title, actions, children }) => {
  return <Layout title={title} actions={actions}>{children}</Layout>;
};
