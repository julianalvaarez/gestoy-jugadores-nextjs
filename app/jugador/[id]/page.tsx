import { notFound } from 'next/navigation';
import { supabase, Player, Transaction, FixedTransaction } from '@/lib/supabase';
import { getDollarBlueRate } from '@/lib/dollar';
import PlayerProfileClient from '@/components/PlayerProfileClient';

export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayerPage({ params }: PageProps) {
  const { id } = await params;
  const playerId = parseInt(id, 10);

  if (isNaN(playerId)) {
    notFound();
  }

  const [{ data: playerData }, { data: txData }, { data: fixedData }, dollarRate] =
    await Promise.all([
      supabase.from('players').select('*').eq('id', playerId).single(),
      supabase
        .from('transactions')
        .select('*')
        .eq('player_id', playerId)
        .order('date', { ascending: false }),
      supabase
        .from('fixed_transactions')
        .select('*')
        .eq('player_id', playerId)
        .order('id', { ascending: false }),
      getDollarBlueRate(),
    ]);

  if (!playerData) {
    notFound();
  }

  const player: Player = playerData;
  const transactions: Transaction[] = txData || [];
  const fixedTransactions: FixedTransaction[] = fixedData || [];

  return (
    <PlayerProfileClient
      player={player}
      initialTransactions={transactions}
      initialFixedTransactions={fixedTransactions}
      dollarRate={dollarRate}
    />
  );
}
