'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Player, Transaction } from '@/lib/supabase';
import {
  formatCurrency,
  getCurrentMonthAndYear,
  getTxAmounts,
  isGastoTx,
} from '@/lib/utils';
import { Search, ChevronRight } from 'lucide-react';

type HomePageClientProps = {
  initialPlayers: Player[];
  initialTransactions: Transaction[];
  dollarRate: number;
};

export default function HomePageClient({
  initialPlayers,
  initialTransactions,
  dollarRate,
}: HomePageClientProps) {
  const [search, setSearch] = useState('');
  const { month: currentMonth, year: currentYear } = getCurrentMonthAndYear();

  // Filter current month transactions
  const currentMonthTransactions = useMemo(() => {
    return initialTransactions.filter((tx) => {
      if (!tx.date) return false;
      const [txYear, txMonth] = tx.date.split('T')[0].split('-');
      return txYear === currentYear && txMonth === currentMonth;
    });
  }, [initialTransactions, currentMonth, currentYear]);

  // Compute current month balance in ARS for each player
  const playerBalancesARS = useMemo(() => {
    const balances: Record<number, number> = {};

    currentMonthTransactions.forEach((tx) => {
      const { amountARS } = getTxAmounts(tx, dollarRate);
      if (!balances[tx.player_id]) balances[tx.player_id] = 0;

      if (isGastoTx(tx.type)) {
        balances[tx.player_id] -= amountARS;
      } else {
        balances[tx.player_id] += amountARS;
      }
    });

    return balances;
  }, [currentMonthTransactions, dollarRate]);

  // Filter players by search
  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return initialPlayers;
    const q = search.toLowerCase().trim();
    return initialPlayers.filter((p) => p.name.toLowerCase().includes(q));
  }, [initialPlayers, search]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Buscador y Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador por nombre..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <span className="text-xs sm:text-sm text-slate-500 font-medium self-end sm:self-center">
          {filteredPlayers.length} jugador(es)
        </span>
      </div>

      {/* Grid de Jugadores */}
      {filteredPlayers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center shadow-xs">
          <p className="text-sm sm:text-base font-medium text-slate-600">No se encontraron jugadores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredPlayers.map((player) => {
            const rawBal = playerBalancesARS[player.id] || 0;
            const balARS = Math.abs(rawBal) < 0.01 ? 0 : rawBal;

            let textColorClass = 'text-slate-900';
            if (balARS > 0) textColorClass = 'text-emerald-600';
            if (balARS < 0) textColorClass = 'text-red-600';

            return (
              <div
                key={player.id}
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 sm:space-y-5"
              >
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4 truncate">
                    {player.name}
                  </h3>

                  <div>
                    <span className="text-[11px] sm:text-xs text-slate-500 font-medium block uppercase tracking-wider mb-1">
                      Balance Mes Actual
                    </span>
                    <div className={`text-xl sm:text-2xl font-black ${textColorClass} break-words`}>
                      {formatCurrency(balARS, 'ARS')}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/jugador/${player.id}`}
                  className="inline-flex items-center justify-between w-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                  <span>Ver detalles</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
