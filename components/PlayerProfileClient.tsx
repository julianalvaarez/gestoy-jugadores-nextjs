'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Player, Transaction, FixedTransaction } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
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
  ArrowLeft,
  Plus,
  CalendarClock,
  Download,
  Trash2,
  CheckCircle2,
  Loader2,
  Calendar,
  UserX,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import AddTransactionModal from './AddTransactionModal';
import AddFixedTransactionModal from './AddFixedTransactionModal';
import { resolveRateForTxDate } from '@/lib/dollar';
import { toast } from 'sonner';

type PlayerProfileClientProps = {
  player: Player;
  initialTransactions: Transaction[];
  initialFixedTransactions: FixedTransaction[];
  dollarRate: number;
};

export default function PlayerProfileClient({
  player,
  initialTransactions,
  initialFixedTransactions,
  dollarRate,
}: PlayerProfileClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [fixedTransactions, setFixedTransactions] =
    useState<FixedTransaction[]>(initialFixedTransactions);

  const { month: currentMonth, year: currentYear } = getCurrentMonthAndYear();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isMounted, setIsMounted] = useState(false);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [applyingFixedId, setApplyingFixedId] = useState<number | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<number | null>(null);
  const [deletingFixedId, setDeletingFixedId] = useState<number | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const refreshData = async () => {
    try {
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('player_id', player.id)
        .order('date', { ascending: false });

      if (txData) setTransactions(txData as Transaction[]);

      const { data: fixedData } = await supabase
        .from('fixed_transactions')
        .select('*')
        .eq('player_id', player.id)
        .order('id', { ascending: false });

      if (fixedData) setFixedTransactions(fixedData as FixedTransaction[]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>([currentYear]);
    transactions.forEach((tx) => {
      if (tx.date) {
        const y = tx.date.split('T')[0].split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [transactions, currentYear]);

  // Consolidated Historical Balance
  const historicalBalance = useMemo(() => {
    let ingresosARS = 0;
    let gastosARS = 0;
    let ingresosUSD = 0;
    let gastosUSD = 0;

    transactions.forEach((tx) => {
      const amt = tx.amount || 0;
      const isG = isGastoTx(tx.type);

      if (tx.currency === 'USD') {
        if (isG) gastosUSD += amt;
        else ingresosUSD += amt;
      } else {
        if (isG) gastosARS += amt;
        else ingresosARS += amt;
      }
    });

    return {
      ingresosARS,
      gastosARS,
      balanceARS: ingresosARS - gastosARS,
      ingresosUSD,
      gastosUSD,
      balanceUSD: ingresosUSD - gastosUSD,
    };
  }, [transactions]);

  // Evolution Line Chart (Net monthly balance in ARS)
  const evolutionChartData = useMemo(() => {
    if (transactions.length === 0) return [];
    const monthGroups: Record<string, number> = {};

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sorted.forEach((tx) => {
      if (!tx.date) return;
      const key = tx.date.split('T')[0].substring(0, 7);
      const { amountARS } = getTxAmounts(tx, dollarRate);
      const isG = isGastoTx(tx.type);
      const sign = isG ? -1 : 1;

      monthGroups[key] = (monthGroups[key] || 0) + amountARS * sign;
    });

    return Object.entries(monthGroups).map(([yearMonth, netBalance]) => {
      const [y, m] = yearMonth.split('-');
      const monthLabel = MONTHS.find((item) => item.value === m)?.label.substring(0, 3) || m;
      return {
        label: `${monthLabel} ${y.substring(2)}`,
        balance: netBalance,
      };
    });
  }, [transactions, dollarRate]);

  // Filtered transactions table
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const [txYear, txMonth] = tx.date.split('T')[0].split('-');

      if (selectedYear !== 'all' && txYear !== selectedYear) return false;
      if (selectedMonth !== 'all' && txMonth !== selectedMonth) return false;
      return true;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const handleDeleteTransaction = async (txId: number) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    setDeletingTxId(txId);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txId);
      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
      toast.success('Transacción eliminada correctamente.');
    } catch (err) {
      console.error('Error deleting tx:', err);
      toast.error('Error al eliminar la transacción');
    } finally {
      setDeletingTxId(null);
    }
  };

  const handleApplyFixed = async (fixed: FixedTransaction) => {
    setApplyingFixedId(fixed.id);
    try {
      const today = new Date().toISOString().split('T')[0];
      const rateToSave = resolveRateForTxDate(today, dollarRate);

      const { error } = await supabase.from('transactions').insert([
        {
          player_id: player.id,
          type: fixed.type,
          description: fixed.description,
          amount: fixed.amount,
          currency: fixed.currency,
          usd_rate: rateToSave,
          date: today,
        },
      ]);

      if (error) throw error;
      toast.success(`Transacción fija "${fixed.description || ''}" aplicada con fecha de hoy.`);
      await refreshData();
    } catch (err) {
      console.error('Error applying fixed tx:', err);
      toast.error('Error al aplicar gasto fijo');
    } finally {
      setApplyingFixedId(null);
    }
  };

  const handleDeleteFixed = async (fixedId: number) => {
    if (!confirm('¿Eliminar esta transacción fija?')) return;
    setDeletingFixedId(fixedId);
    try {
      const { error } = await supabase.from('fixed_transactions').delete().eq('id', fixedId);
      if (error) throw error;
      setFixedTransactions((prev) => prev.filter((f) => f.id !== fixedId));
      toast.success('Gasto fijo eliminado.');
    } catch (err) {
      console.error('Error deleting fixed tx:', err);
      toast.error('Error al eliminar');
    } finally {
      setDeletingFixedId(null);
    }
  };

  const handleDeletePlayer = async () => {
    const confirmName = prompt(
      `¿Estás seguro de que deseas ELIMINAR a ${player.name} y todos sus datos?\nEscribe "${player.name}" para confirmar:`
    );
    if (!confirmName || confirmName.trim() !== player.name) {
      if (confirmName !== null) alert('El nombre no coincide. Operación cancelada.');
      return;
    }

    setDeletingPlayer(true);
    try {
      await supabase.from('documents').delete().eq('player_id', player.id);
      await supabase.from('transactions').delete().eq('player_id', player.id);
      await supabase.from('fixed_transactions').delete().eq('player_id', player.id);
      const { error } = await supabase.from('players').delete().eq('id', player.id);
      if (error) throw error;

      toast.success(`Jugador "${player.name}" eliminado correctamente.`);
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Error deleting player:', err);
      toast.error('No se pudo eliminar el jugador');
      setDeletingPlayer(false);
    }
  };

  // Export history ordered chronologically
  const handleExportHistory = () => {
    const sortedTx = [...transactions].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateA.localeCompare(dateB);
    });

    const dataToExport = sortedTx.map((tx) => {
      const { amountARS, amountUSD, rate } = getTxAmounts(tx, dollarRate);
      const [year, monthNum] = tx.date ? tx.date.split('T')[0].split('-') : ['', ''];
      const monthLabel = MONTHS.find((m) => m.value === monthNum)?.label || monthNum;
      const isG = isGastoTx(tx.type);

      return {
        Jugador: player.name,
        Año: year,
        Mes: monthLabel,
        Fecha: formatDate(tx.date),
        Tipo: isG ? 'Gasto' : 'Ingreso',
        Descripción: tx.description || '-',
        'Monto Original': tx.amount,
        Moneda: tx.currency,
        'Cotización USD': rate,
        'Monto (ARS)': isG ? -amountARS : amountARS,
        'Monto (USD)': isG ? -amountUSD : amountUSD,
      };
    });

    exportToExcel(dataToExport, `Historial_${player.name.replace(/\s+/g, '_')}`);
    toast.success('Historial exportado a Excel.');
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Botón Volver y Header Jugador */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 mb-3 sm:mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al inicio</span>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 break-words">
              {player.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-slate-500 font-medium">
              {player.position && (
                <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-xs font-bold">
                  {player.position}
                </span>
              )}
              {player.birth_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" /> Nacimiento: {formatDate(player.birth_date)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear transacción</span>
            </button>

            <button
              onClick={() => setIsFixedModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors border border-slate-300 cursor-pointer"
            >
              <CalendarClock className="w-4 h-4" />
              <span>Gasto fijo</span>
            </button>

            <button
              onClick={handleExportHistory}
              disabled={transactions.length === 0}
              className="inline-flex items-center justify-center space-x-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 disabled:opacity-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            {/* Botón Eliminar Jugador */}
            <button
              onClick={handleDeletePlayer}
              disabled={deletingPlayer}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 disabled:opacity-50 px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              title="Eliminar jugador"
            >
              {deletingPlayer ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              ) : (
                <>
                  <UserX className="w-4 h-4 text-red-600" />
                  <span>Eliminar Jugador</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Balance Consolidado & Gráfico de Evolución */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Balance Histórico Consolidado (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-xs space-y-4 sm:space-y-6">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
            Balance Histórico Consolidado
          </h3>

          {/* Renglón ARS */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-700">Pesos (ARS)</span>
              <span
                className={`text-lg sm:text-xl font-black ${historicalBalance.balanceARS >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
              >
                {formatCurrency(historicalBalance.balanceARS, 'ARS')}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/80">
              <span>Ingresos: <strong className="text-emerald-600">{formatCurrency(historicalBalance.ingresosARS, 'ARS')}</strong></span>
              <span>Gastos: <strong className="text-red-600">{formatCurrency(historicalBalance.gastosARS, 'ARS')}</strong></span>
            </div>
          </div>

          {/* Renglón USD */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-700">Dólares (USD)</span>
              <span
                className={`text-lg sm:text-xl font-black ${historicalBalance.balanceUSD >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
              >
                {formatCurrency(historicalBalance.balanceUSD, 'USD')}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/80">
              <span>Ingresos: <strong className="text-emerald-600">{formatCurrency(historicalBalance.ingresosUSD, 'USD')}</strong></span>
              <span>Gastos: <strong className="text-red-600">{formatCurrency(historicalBalance.gastosUSD, 'USD')}</strong></span>
            </div>
          </div>
        </div>

        {/* Gráfico de Evolución (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider">
            Evolución del Balance (Mes a Mes)
          </h3>

          {evolutionChartData.length === 0 ? (
            <div className="h-48 sm:h-56 flex items-center justify-center text-xs sm:text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Sin movimientos registrados para el gráfico
            </div>
          ) : !isMounted ? (
            <div className="h-48 sm:h-56 flex items-center justify-center text-xs text-slate-400">
              Cargando gráfico...
            </div>
          ) : (
            <div className="w-full h-[220px] sm:h-[240px]" style={{ minHeight: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 11 }}
                    tickFormatter={(val) =>
                      val < 0
                        ? `-$${(Math.abs(val) / 1000).toFixed(0)}k`
                        : `$${(val / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(val) => [formatCurrency(Number(val ?? 0), 'ARS'), 'Balance Neto']}
                    contentStyle={{ borderRadius: '0.5rem', border: '1px solid #CBD5E1' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#0F172A"
                    strokeWidth={3}
                    dot={{ fill: '#0F172A', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-xs space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">Historial de Movimientos</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mostrando {filteredTransactions.length} registro(s)
            </p>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg px-2.5 py-2 outline-none cursor-pointer"
            >
              <option value="all">Todos los Meses</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg px-2.5 py-2 outline-none cursor-pointer"
            >
              <option value="all">Todos los Años</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 sm:py-10 text-xs sm:text-sm text-slate-500">
            No existen movimientos registrados para el período seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 font-bold text-slate-600 bg-slate-50 text-[11px] sm:text-xs">
                  <th className="py-3 px-3 sm:px-4">Tipo</th>
                  <th className="py-3 px-3 sm:px-4">Fecha</th>
                  <th className="py-3 px-3 sm:px-4">Descripción</th>
                  <th className="py-3 px-3 sm:px-4">Monto (ARS)</th>
                  <th className="py-3 px-3 sm:px-4">Monto (USD)</th>
                  <th className="py-3 px-3 sm:px-4">Cotización USD</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const isGasto = isGastoTx(tx.type);
                  const isIngreso = !isGasto;
                  const { amountARS, amountUSD, rate } = getTxAmounts(tx, dollarRate);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 sm:px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap ${isIngreso
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                        >
                          {isIngreso ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-slate-600 whitespace-nowrap font-medium">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900">
                        {tx.description || '-'}
                      </td>
                      <td
                        className={`py-3 px-3 sm:px-4 font-black whitespace-nowrap ${isIngreso ? 'text-emerald-600' : 'text-red-600'
                          }`}
                      >
                        {formatSignedCurrency(amountARS, isGasto, 'ARS')}
                      </td>
                      <td
                        className={`py-3 px-3 sm:px-4 font-bold whitespace-nowrap ${isIngreso ? 'text-emerald-600' : 'text-red-600'
                          }`}
                      >
                        {formatSignedCurrency(amountUSD, isGasto, 'USD')}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-slate-500 font-medium text-xs whitespace-nowrap">
                        ${rate}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          disabled={deletingTxId === tx.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Eliminar movimiento"
                        >
                          {deletingTxId === tx.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seccion Transacciones Fijas ABAJO DE TODO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              <span>Transacciones Fijas Configuradas</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gastos o ingresos recurrentes. Presiona "Aplicar" para generarlos con la fecha de hoy.
            </p>
          </div>
          <button
            onClick={() => setIsFixedModalOpen(true)}
            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            + Nueva Fija
          </button>
        </div>

        {fixedTransactions.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs sm:text-sm text-slate-500">
            No tienes transacciones fijas configuradas para este jugador.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {fixedTransactions.map((fixed) => (
              <div
                key={fixed.id}
                className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${!isGastoTx(fixed.type)
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {!isGastoTx(fixed.type) ? 'Ingreso' : 'Gasto'}
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[120px]">
                      {fixed.description || 'Sin descripción'}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-black text-slate-800 mt-1">
                    {formatCurrency(fixed.amount, fixed.currency)}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleApplyFixed(fixed)}
                    disabled={applyingFixedId === fixed.id}
                    className="inline-flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {applyingFixedId === fixed.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aplicar</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteFixed(fixed.id)}
                    disabled={deletingFixedId === fixed.id}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      {isTxModalOpen && (
        <AddTransactionModal
          playerId={player.id}
          onClose={() => setIsTxModalOpen(false)}
          onSuccess={() => {
            setIsTxModalOpen(false);
            refreshData();
          }}
        />
      )}

      {isFixedModalOpen && (
        <AddFixedTransactionModal
          playerId={player.id}
          onClose={() => setIsFixedModalOpen(false)}
          onSuccess={() => {
            setIsFixedModalOpen(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
