'use client';

import { Sidebar, SidebarProvider } from './sidebar';
import { Header } from './header';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50 dark:bg-black font-sans">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-10 lg:pb-10 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
