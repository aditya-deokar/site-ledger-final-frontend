'use client';

import { Sidebar, SidebarProvider } from './sidebar';
import { Header } from './header';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-black overflow-hidden font-sans">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
