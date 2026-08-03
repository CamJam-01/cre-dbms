'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function Nav({ email }: { email: string }) {
  const router = useRouter(); const pathname = usePathname(); const supabase = createClient(); const [open, setOpen] = useState(false);
  async function logout() { setOpen(false); await supabase.auth.signOut(); router.push('/'); router.refresh(); }
  function linkClass(path: string) { return pathname === path ? 'active' : undefined; }
  return <header className="topbar"><div className="topbar-inner">
    <Link href="/" className="brand" onClick={() => setOpen(false)}>Vantage CRE</Link>
    <nav className="nav" aria-label="Authenticated navigation">
      <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="authenticated-nav-links" onClick={() => setOpen(value => !value)}>{open ? 'Close menu' : 'Menu'}</button>
      <div id="authenticated-nav-links" className={`nav-links${open ? ' open' : ''}`}>
        <Link href="/dashboard" className={linkClass('/dashboard')} aria-current={pathname === '/dashboard' ? 'page' : undefined} onClick={() => setOpen(false)}>Dashboard</Link>
        <Link href="/comp-data" className={linkClass('/comp-data')} aria-current={pathname === '/comp-data' ? 'page' : undefined} onClick={() => setOpen(false)}>Comp Data</Link>
        <Link href="/users" className={linkClass('/users')} aria-current={pathname === '/users' ? 'page' : undefined} onClick={() => setOpen(false)}>Users</Link>
        <span className="muted">{email}</span>
        <button type="button" onClick={logout}>Log out</button>
      </div>
    </nav>
  </div></header>;
}
