import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar />
      <main className="flex-1 ml-64 px-4 py-4 overflow-y-auto overflow-x-hidden h-screen">
        {children}
      </main>
    </div>
  );
};

export default Layout;
