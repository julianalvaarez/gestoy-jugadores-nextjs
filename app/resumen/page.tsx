import { supabase, Player, Transaction } from '@/lib/supabase';
import { getDollarBlueRate } from '@/lib/dollar';
import ResumenClient from '@/components/ResumenClient';

export const revalidate = 0;

export default async function ResumenPage() {
  const [{ data: playersData }, { data: txData }, dollarRate] = await Promise.all([
    supabase.from('players').select('*').order('name', { ascending: true }),
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    getDollarBlueRate(),
  ]);

  const players: Player[] = playersData || [];
  const transactions: Transaction[] = txData || [];

  return (
    <ResumenClient
      players={players}
      transactions={transactions}
      dollarRate={dollarRate}
    />
  );
}
