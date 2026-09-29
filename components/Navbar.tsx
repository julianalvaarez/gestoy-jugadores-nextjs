'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, BarChart2, Users } from 'lucide-react';
import AddPlayerModal from './AddPlayerModal';

export default function Navbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handlePlayerCreated = (playerId: number) => {
    setIsModalOpen(false);
    router.push(`/jugador/${playerId}`);
    router.refresh();
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <Link
              href="/"
              className="flex items-center space-x-2 text-sm sm:text-base font-bold text-slate-900 tracking-tight shrink-0"
            >
              <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                G
              </div>
              <span className="hidden min-[380px]:inline">Gestor Jugadores</span>
            </Link>

            <nav className="flex items-center space-x-1">
              <Link
                href="/"
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 ${pathname === '/'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Plantilla</span>
              </Link>
              <Link
                href="/resumen"
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 ${pathname === '/resumen'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Resumen</span>
                <span className="sm:hidden">Resumen</span>
              </Link>
            </nav>
          </div>

          {/* Action Button */}
          <div className="flex items-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-2.5 sm:px-3.5 py-1.5 rounded-md font-medium text-xs transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo<span className="hidden sm:inline"> Jugador</span></span>
            </button>
          </div>
        </div>
      </header>

      {isModalOpen && (
        <AddPlayerModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handlePlayerCreated}
        />
      )}
    </>
  );
}
