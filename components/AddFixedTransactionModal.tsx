'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, CalendarClock, Loader2 } from 'lucide-react';

type AddFixedTransactionModalProps = {
  playerId: number;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddFixedTransactionModal({
  playerId,
  onClose,
  onSuccess,
}: AddFixedTransactionModalProps) {
  const [type, setType] = useState<'Ingreso' | 'Gasto'>('Gasto');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { error: insertError } = await supabase.from('fixed_transactions').insert([
        {
          player_id: playerId,
          type,
          description: description.trim() || null,
          amount: Math.round(parsedAmount),
          currency,
        },
      ]);

      if (insertError) throw insertError;
      onSuccess();
    } catch (err: unknown) {
      console.error('Error al registrar gasto fijo:', err);
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar el gasto fijo';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <CalendarClock className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">Crear transacción fija</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('Gasto')}
                className={`py-1.5 px-3 rounded text-xs font-semibold border transition-all ${type === 'Gasto'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Gasto Fijo
              </button>
              <button
                type="button"
                onClick={() => setType('Ingreso')}
                className={`py-1.5 px-3 rounded text-xs font-semibold border transition-all ${type === 'Ingreso'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                Ingreso Fijo
              </button>
            </div>
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
              placeholder="Ej: Alquiler, Sueldo, Viáticos"
              required
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
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
                step="1"
                min="0"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
              />
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
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors"
            >
              {submitting ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                </span>
              ) : (
                'Guardar Fijo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
