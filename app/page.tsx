import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <main className="home-shell">
    <section className="home-hero">
      <div className="home-hero-copy">
        <div className="home-eyebrow">Commercial real estate data workspace</div>
        <h1>Comps organized for better decisions.</h1>
        <p className="home-lede">Vantage CRE gives teams a focused workspace for capturing, searching, and managing commercial real estate sales data.</p>
        <div className="home-actions">
          <Link className="btn primary" href={user ? '/dashboard' : '/login'}>{user ? 'Go to dashboard' : 'Sign in'}</Link>
          {!user && <Link className="btn" href="/signup">Create an account</Link>}
        </div>
      </div>
    </section>

    <section className="frame corner-mark home-section">
      <div className="home-section-head"><div><div className="section-label">01 / Workspace</div><h2>One place for the records your team relies on.</h2></div><p>Search, filter, sort, import, export, and update sale records without losing the context behind each comp.</p></div>
      <div className="home-grid">
        <article className="card"><span className="feature-index">01</span><h3>Centralized records</h3><p className="muted">Keep land-sale comparables in one searchable database with direct, immediate updates.</p></article>
        <article className="card"><span className="feature-index">02</span><h3>Practical data tools</h3><p className="muted">Move from a market question to a clean, exportable set of records with focused controls.</p></article>
        <article className="card"><span className="feature-index">03</span><h3>Built to grow</h3><p className="muted">Start with land sales and expand into the CRE datasets and workflows your team needs next.</p></article>
      </div>
    </section>

    <section className="frame home-section">
      <div className="home-section-head"><div><div className="section-label">02 / Workflow</div><h2>From raw transaction to usable comp.</h2></div></div>
      <div className="workflow-grid">
        <article className="workflow-step"><span className="feature-index">01</span><h3>Capture</h3><p>Add records directly or bring in structured CSV data.</p></article>
        <article className="workflow-step"><span className="feature-index">02</span><h3>Normalize</h3><p>Keep property, date, price, acreage, buyer, and seller fields consistent.</p></article>
        <article className="workflow-step"><span className="feature-index">03</span><h3>Analyze</h3><p>Search and filter the records that matter to the current market question.</p></article>
        <article className="workflow-step"><span className="feature-index">04</span><h3>Export</h3><p>Carry a clean, focused comp set into the next underwriting conversation.</p></article>
      </div>
    </section>
  </main>;
}
