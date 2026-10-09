import { AdminShell } from '@/components/shell/AdminShell';

export const metadata = { title: 'Panel · Diagnóstico Organizacional LinkTIC' };

/**
 * El acceso ya lo filtró `src/proxy.ts` (firma y vigencia de la sesión) y lo valida cada
 * route handler de /api/v1/admin en cada llamada. Aquí solo va el chrome del panel.
 */
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return <AdminShell>{children}</AdminShell>;
}
