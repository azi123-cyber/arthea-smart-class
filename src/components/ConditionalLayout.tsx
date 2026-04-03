'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Define routes that should NOT have the sidebar
  const noSidebarRoutes = ['/login', '/register'];
  
  const hideSidebar = 
    noSidebarRoutes.includes(pathname ?? '') || 
    (pathname?.startsWith('/ujian') ?? false) ||
    (pathname?.match(/^\/tryout\/.+/) !== null);

  return (
    <div className="flex w-full min-h-screen overflow-hidden">
      {!hideSidebar && <Sidebar />}
      
      <main 
        className={`flex-1 flex flex-col h-screen overflow-y-auto w-full relative`}
      >
        <div 
          className={`flex-grow pb-24 ${
            hideSidebar ? 'w-full h-full' : 'w-full max-w-7xl mx-auto p-4 md:p-8'
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
