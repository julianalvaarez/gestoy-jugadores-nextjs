import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Gestor de Jugadores | Agencia de Representación',
  description: 'Sistema de gestión de gastos, ingresos y balances de jugadores de fútbol',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col font-sans antialiased">
        <Toaster position="top-right" richColors />
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white py-6 mt-12 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Agencia de Representación - Gestor de Jugadores</p>
        </footer>
      </body>
    </html>
  );
}
