'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getDollarBlueRate, resolveRateForTxDate } from '@/lib/dollar';
import { formatCurrency } from '@/lib/utils';
import { X, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AddTransactionModalProps = {
  playerId: number;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddTransactionModal({
  playerId,
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const [type, setType] = useState<'Ingreso' | 'Gasto'>('Gasto');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [usdRate, setUsdRate] = useState<number>(1450);
  const [loadingRate, setLoadingRate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function updateRate() {
      setLoadingRate(true);
      const isCurrentMonth =
        date.substring(0, 7) === new Date().toISOString().substring(0, 7);

      if (isCurrentMonth) {
        try {
          const live = await getDollarBlueRate();
          if (isMounted) setUsdRate(live);
        } catch {
          if (isMounted) setUsdRate(resolveRateForTxDate(date));
        }
      } else {
        if (isMounted) setUsdRate(resolveRateForTxDate(date));
      }
      setLoadingRate(false);
    }

    updateRate();

    return () => {
      isMounted = false;
    };
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('El monto debe ser un número mayor a 0.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const rateToSave = usdRate > 0 ? usdRate : resolveRateForTxDate(date);

      const { error: insertError } = await supabase.from('transactions').insert([
        {
          player_id: playerId,
          type,
          description: description.trim() || null,
          date,
          amount: parsedAmount,
          currency,
          usd_rate: rateToSave,
        },
      ]);

      if (insertError) throw insertError;
      toast.success(`${type} de ${formatCurrency(parsedAmount, currency)} registrado.`);
      onSuccess();
    } catch (err: unknown) {
      console.error('Error al registrar transacción:', err);
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar la transacción';
      setError(message);
      toast.error('Error al registrar la transacción');
    } finally {
      setSubmitting(false);
    }
  };

  const parsedAmt = parseFloat(amount) || 0;
  const calculatedARS = currency === 'USD' ? parsedAmt * usdRate : parsedAmt;
  const calculatedUSD = currency === 'ARS' && usdRate > 0 ? parsedAmt / usdRate : parsedAmt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-semibold text-slate-900">Nueva transacción</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('Gasto')}
                className={`py-2 px-3 rounded text-xs font-semibold border transition-all ${type === 'Gasto'
                    ? 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setType('Ingreso')}
                className={`py-2 px-3 rounded text-xs font-semibold border transition-all ${type === 'Ingreso'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Ingreso
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="date" className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-slate-700 mb-1">
                Descripción
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Alquiler, Viáticos, Sueldo"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'ARS' | 'USD')}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none bg-white"
              >
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD (US$)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label htmlFor="amount" className="block text-xs font-semibold text-slate-700 mb-1">
                Monto ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Cotización del Dólar ({date.substring(0, 7)}):</span>
              <div className="flex items-center gap-1 font-bold text-slate-900">
                {loadingRate ? (
                  <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                ) : (
                  <span>${usdRate}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
              <span>Equiv. ARS: <strong className="text-slate-800">{formatCurrency(calculatedARS, 'ARS')}</strong></span>
              <span>Equiv. USD: <strong className="text-slate-800">{formatCurrency(calculatedUSD, 'USD')}</strong></span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors shadow-2xs"
            >
              {submitting ? 'Guardando...' : 'Guardar Transacción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
