import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <main className="home-shell">
    <section className="home-hero">
      <div className="home-eyebrow">Commercial Real Estate Database Management</div>
      <h1>CRE DBMS</h1>
      <p className="home-lede">A focused workspace for organizing, searching, and managing commercial real estate sales data.</p>
      <div className="home-actions">
        <Link className="btn primary" href={user ? '/dashboard' : '/login'}>{user ? 'Go to dashboard' : 'Sign in'}</Link>
        {!user && <Link className="btn" href="/signup">Create an account</Link>}
      </div>
    </section>
    <section className="home-grid">
      <article className="card"><h2>Centralized records</h2><p className="muted">Keep land sales information in one searchable database with direct, immediate updates.</p></article>
      <article className="card"><h2>Powerful data tools</h2><p className="muted">Search, filter, sort, import, and export sales records from a single workspace.</p></article>
      <article className="card"><h2>Built to grow</h2><p className="muted">The application is designed to expand into additional commercial real estate datasets and workflows.</p></article>
    </section>
  </main>;
}
