'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AddPlayerModalProps = {
  onClose: () => void;
  onSuccess: (newPlayerId: number) => void;
};

export default function AddPlayerModal({ onClose, onSuccess }: AddPlayerModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre del jugador es obligatorio.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('players')
        .insert([{ name: trimmedName }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) {
        toast.success(`Jugador "${trimmedName}" creado correctamente.`);
        onSuccess(data.id);
      }
    } catch (err: unknown) {
      console.error('Error al crear jugador:', err);
      const message = err instanceof Error ? err.message : 'No se pudo crear el jugador';
      setError(message);
      toast.error('Error al crear el jugador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">Agregar jugador</h3>
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
            <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del jugador"
              autoFocus
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
            />
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
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                </span>
              ) : (
                'Crear Jugador'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
