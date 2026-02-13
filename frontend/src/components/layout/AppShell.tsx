'use client';

import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header sidebarCollapsed={collapsed} />
      <main
        className={`min-h-screen pt-16 transition-all duration-300 ${
          collapsed ? 'pl-16' : 'pl-60'
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </>
  );
}
