'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createQueryClient } from '@/lib/query-client';

/**
 * El QueryClient se crea en estado para que cada sesión de navegador tenga el suyo y no
 * se compartan datos entre requests durante el renderizado en servidor.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
