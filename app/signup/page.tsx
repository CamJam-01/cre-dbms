'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter(); const supabase = createClient();
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) setError(error.message);
    else if (data.session) router.push('/dashboard');
    else setMessage('Account created. Check your email if confirmation is enabled, then sign in.');
    setLoading(false);
  }
  return <main className="auth-shell"><section className="card auth-card">
    <div className="eyebrow">Vantage CRE / New workspace</div><h1>Create account</h1><p className="muted">Create an account for the Vantage CRE workspace.</p>
    {error && <div className="alert">{error}</div>}{message && <div className="alert">{message}</div>}
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="signup-name">Full name</label><input id="signup-name" autoComplete="name" required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
      <div className="field" style={{marginTop: 12}}><label htmlFor="signup-email">Email</label><input id="signup-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="field" style={{marginTop: 12}}><label htmlFor="signup-password">Password</label><input id="signup-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></div>
      <div className="actions"><button className="btn primary" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button></div>
    </form>
    <div className="auth-footer">Already have an account? <Link href="/login"><strong>Sign in</strong></Link></div>
  </section></main>;
}
