'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Nav({ email }: { email: string }) {
  const router = useRouter(); const supabase = createClient();
  async function logout() { await supabase.auth.signOut(); router.push('/login'); router.refresh(); }
  return <header className="topbar"><div className="topbar-inner">
    <Link href="/land-sales" className="brand">CRE DBMS</Link>
    <nav className="nav"><Link href="/land-sales">Land Sales</Link><Link href="/users">Users</Link><span className="muted">{email}</span><button onClick={logout}>Log out</button></nav>
  </div></header>;
}
