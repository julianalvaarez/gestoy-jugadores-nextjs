import { supabase, Player, Transaction } from '@/lib/supabase';
import { getDollarBlueRate } from '@/lib/dollar';
import HomePageClient from '@/components/HomePageClient';

export const revalidate = 0; // Server Component - dynamic data on request

export default async function HomePage() {
  const [{ data: playersData }, { data: txData }, dollarRate] = await Promise.all([
    supabase.from('players').select('*').order('name', { ascending: true }),
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    getDollarBlueRate(),
  ]);

  const players: Player[] = playersData || [];
  const transactions: Transaction[] = txData || [];

  return (
    <HomePageClient
      initialPlayers={players}
      initialTransactions={transactions}
      dollarRate={dollarRate}
    />
  );
}
