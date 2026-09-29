import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { Transaction } from './supabase';
import { resolveRateForTxDate } from './dollar';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isGastoTx(type?: string | null): boolean {
  if (!type) return false;
  const n = String(type).toLowerCase().trim();
  return (
    n === 'expense' ||
    n === 'gasto' ||
    n.includes('expense') ||
    n.includes('gasto') ||
    n.startsWith('exp') ||
    n.startsWith('gas')
  );
}

export function isIngresoTx(type?: string | null): boolean {
  return !isGastoTx(type);
}

export function formatCurrency(amount: number, currency: 'ARS' | 'USD' = 'ARS'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'ARS',
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatSignedCurrency(
  amount: number,
  isGasto: boolean,
  currency: 'ARS' | 'USD' = 'ARS'
): string {
  const absVal = Math.abs(amount);
  const formatted = formatCurrency(absVal, currency);
  if (absVal === 0) return formatted;
  return isGasto ? `- ${formatted}` : `+ ${formatted}`;
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const dateParts = dateString.split('T')[0].split('-');
  if (dateParts.length === 3) {
    const [year, month, day] = dateParts;
    return `${day}/${month}/${year}`;
  }
  return dateString;
}

export function getTxAmounts(tx: Transaction, currentLiveRate?: number): {
  amountARS: number;
  amountUSD: number;
  rate: number;
} {
  const rate = tx.usd_rate && tx.usd_rate > 0
    ? tx.usd_rate
    : resolveRateForTxDate(tx.date, currentLiveRate);

  if (tx.currency === 'USD') {
    return {
      amountUSD: tx.amount || 0,
      amountARS: (tx.amount || 0) * rate,
      rate,
    };
  } else {
    return {
      amountARS: tx.amount || 0,
      amountUSD: rate > 0 ? (tx.amount || 0) / rate : 0,
      rate,
    };
  }
}

export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export const MONTHS = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export function getCurrentMonthAndYear(): { month: string; year: string } {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  return { month, year };
}
