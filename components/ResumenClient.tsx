'use client';

import { useState, useMemo, useEffect } from 'react';
import { Player, Transaction } from '@/lib/supabase';
import {
  formatCurrency,
  formatSignedCurrency,
  formatDate,
  MONTHS,
  getCurrentMonthAndYear,
  exportToExcel,
  getTxAmounts,
  isGastoTx,
} from '@/lib/utils';
import {
  Search,
  Download,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

type ResumenClientProps = {
  players: Player[];
  transactions: Transaction[];
  dollarRate: number;
};

export default function ResumenClient({
  players,
  transactions,
  dollarRate,
}: ResumenClientProps) {
  const { month: initialMonth, year: initialYear } = getCurrentMonthAndYear();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [playerSearch, setPlayerSearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const playerMap = useMemo(() => {
    const map = new Map<number, Player>();
    players.forEach((p) => map.set(p.id, p));
    return map;
  }, [players]);

  const availableYears = useMemo(() => {
    const years = new Set<string>([initialYear]);
    transactions.forEach((tx) => {
      if (tx.date) {
        const y = tx.date.split('T')[0].split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [transactions, initialYear]);

  // Filter transactions by selected month & year
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const [txYear, txMonth] = tx.date.split('T')[0].split('-');
      return txYear === selectedYear && txMonth === selectedMonth;
    });
  }, [transactions, selectedMonth, selectedYear]);

  // Totals for month
  const { totalIngresosARS, totalGastosARS } = useMemo(() => {
    let ingARS = 0;
    let gastARS = 0;

    monthTransactions.forEach((tx) => {
      const { amountARS } = getTxAmounts(tx, dollarRate);
      if (isGastoTx(tx.type)) {
        gastARS += amountARS;
      } else {
        ingARS += amountARS;
      }
    });

    return {
      totalIngresosARS: ingARS,
      totalGastosARS: gastARS,
    };
  }, [monthTransactions, dollarRate]);

  const balanceARS = totalIngresosARS - totalGastosARS;

  // Filter table by player search
  const filteredTableTransactions = useMemo(() => {
    if (!playerSearch.trim()) return monthTransactions;
    const q = playerSearch.toLowerCase().trim();
    return monthTransactions.filter((tx) => {
      const pName = playerMap.get(tx.player_id)?.name || '';
      return pName.toLowerCase().includes(q);
    });
  }, [monthTransactions, playerSearch, playerMap]);

  // Bar chart data for expenses per player
  const chartData = useMemo(() => {
    const map: Record<number, { name: string; totalGastoARS: number }> = {};

    monthTransactions.forEach((tx) => {
      if (isGastoTx(tx.type)) {
        const pId = tx.player_id;
        const name = playerMap.get(pId)?.name || `Jugador #${pId}`;
        const { amountARS } = getTxAmounts(tx, dollarRate);

        if (!map[pId]) map[pId] = { name, totalGastoARS: 0 };
        map[pId].totalGastoARS += amountARS;
      }
    });

    return Object.values(map).sort((a, b) => b.totalGastoARS - a.totalGastoARS);
  }, [monthTransactions, playerMap, dollarRate]);

  const handleExportExcel = () => {
    // Clonamos y ordenamos las transacciones: primero por nombre del jugador alfabéticamente, luego por fecha
    const sortedTransactions = [...monthTransactions].sort((a, b) => {
      const nameA = (playerMap.get(a.player_id)?.name || `ID #${a.player_id}`).toLowerCase();
      const nameB = (playerMap.get(b.player_id)?.name || `ID #${b.player_id}`).toLowerCase();
      const nameCompare = nameA.localeCompare(nameB, 'es', { numeric: true });
      if (nameCompare !== 0) return nameCompare;

      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateA.localeCompare(dateB);
    });

    const dataToExport = sortedTransactions.map((tx) => {
      const playerName = playerMap.get(tx.player_id)?.name || `ID #${tx.player_id}`;
      const { amountARS, amountUSD, rate } = getTxAmounts(tx, dollarRate);
      const isG = isGastoTx(tx.type);

      return {
        Jugador: playerName,
        Tipo: isG ? 'Gasto' : 'Ingreso',
        Descripción: tx.description || '-',
        Fecha: formatDate(tx.date),
        'Monto Original': tx.amount,
        Moneda: tx.currency,
        'Cotización USD': rate,
        'Monto (ARS)': isG ? -amountARS : amountARS,
        'Monto (USD)': isG ? -amountUSD : amountUSD,
      };
    });

    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;
    exportToExcel(dataToExport, `Resumen_${monthLabel}_${selectedYear}`);
  };

  const monthName = MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  let balanceColor = 'text-slate-900';
  if (balanceARS > 0) balanceColor = 'text-emerald-600';
  if (balanceARS < 0) balanceColor = 'text-red-600';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* Controles de Selección de Fecha y Exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-slate-900">Resumen Mensual</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Select de Mes */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg px-3 sm:px-4 py-2 pr-8 outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
              ▼
            </div>
          </div>

          {/* Select de Año */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg px-3 sm:px-4 py-2 pr-8 outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
              ▼
            </div>
          </div>

          {/* Botón Exportar Excel */}
          <button
            onClick={handleExportExcel}
            disabled={monthTransactions.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Card del Resumen Mensual Grande */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-sm text-center space-y-4 sm:space-y-6">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
          Balance General ({monthName} {selectedYear})
        </span>
        <div className={`text-3xl sm:text-4xl md:text-5xl font-black ${balanceColor} break-words`}>
          {formatCurrency(balanceARS, 'ARS')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto pt-4 sm:pt-6 border-t border-slate-100 text-sm">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Ingresos</span>
            <span className="text-base sm:text-lg font-bold text-emerald-700">{formatCurrency(totalIngresosARS, 'ARS')}</span>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-red-800 uppercase block">Gastos</span>
            <span className="text-base sm:text-lg font-bold text-red-700">{formatCurrency(totalGastosARS, 'ARS')}</span>
          </div>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Listado de Movimientos ({monthName} {selectedYear})
          </h3>

          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Buscar por jugador..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {filteredTableTransactions.length === 0 ? (
          <div className="text-center py-8 text-xs sm:text-sm text-slate-500">
            Sin movimientos en este período.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 font-semibold text-slate-500 bg-slate-50 text-[11px] sm:text-xs">
                  <th className="py-2.5 px-3 sm:px-4">Jugador</th>
                  <th className="py-2.5 px-3 sm:px-4">Tipo</th>
                  <th className="py-2.5 px-3 sm:px-4">Descripción</th>
                  <th className="py-2.5 px-3 sm:px-4">Monto (ARS)</th>
                  <th className="py-2.5 px-3 sm:px-4">Monto (USD)</th>
                  <th className="py-2.5 px-3 sm:px-4">Cotización USD</th>
                  <th className="py-2.5 px-3 sm:px-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTableTransactions.map((tx) => {
                  const player = playerMap.get(tx.player_id);
                  const { amountARS, amountUSD, rate } = getTxAmounts(tx, dollarRate);
                  const isGasto = isGastoTx(tx.type);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 sm:px-4 font-semibold text-slate-900">
                        {player ? player.name : `ID #${tx.player_id}`}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${!isGasto
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                        >
                          {!isGasto ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-slate-700">{tx.description || '-'}</td>
                      <td
                        className={`py-2.5 px-3 sm:px-4 font-bold whitespace-nowrap ${!isGasto ? 'text-emerald-700' : 'text-red-700'
                          }`}
                      >
                        {formatSignedCurrency(amountARS, isGasto, 'ARS')}
                      </td>
                      <td
                        className={`py-2.5 px-3 sm:px-4 font-semibold whitespace-nowrap ${!isGasto ? 'text-emerald-700' : 'text-red-700'
                          }`}
                      >
                        {formatSignedCurrency(amountUSD, isGasto, 'USD')}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-slate-500 text-[11px] whitespace-nowrap">${rate}</td>
                      <td className="py-2.5 px-3 sm:px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gráfico al final de todo */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900">
          Gastos por Jugador ({monthName} {selectedYear})
        </h3>

        {chartData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs sm:text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
            Sin gastos registrados para mostrar en el gráfico
          </div>
        ) : !isMounted ? (
          <div className="h-[280px] sm:h-[320px] flex items-center justify-center text-xs text-slate-400">
            Cargando gráfico...
          </div>
        ) : (
          <div className="w-full h-[280px] sm:h-[320px]" style={{ minHeight: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 15, left: 5, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} interval={0} />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(Number(val ?? 0), 'ARS'), 'Total Gasto']}
                  contentStyle={{ borderRadius: '0.5rem', border: '1px solid #CBD5E1' }}
                />
                <Bar dataKey="totalGastoARS" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#EF4444' : index === 1 ? '#F97316' : '#0284C7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
