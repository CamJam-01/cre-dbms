'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else router.push('/dashboard');
    setLoading(false);
  }

  return <main className="auth-shell"><section className="card auth-card">
    <h1>Vantage CRE</h1><p className="muted">Sign in to manage commercial real estate sales data.</p>
    {error && <div className="alert">{error}</div>}
    <form onSubmit={submit}>
      <div className="field"><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="field" style={{marginTop: 12}}><label>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      <div className="actions"><button className="btn primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button></div>
    </form>
    <div className="auth-footer">New user? <Link href="/signup"><strong>Create an account</strong></Link></div>
  </section></main>;
}
