import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const actor = await authorized(); if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json(); const email = String(body.email ?? '').trim(); const password = String(body.password ?? ''); const full_name = String(body.full_name ?? '').trim();
  if (!email || password.length < 6 || !full_name) return NextResponse.json({ error: 'Full name, email, and a password of at least 6 characters are required.' }, { status: 400 });
  const admin = createAdminClient(); const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data.user });
}

export async function PATCH(request: Request) {
  const actor = await authorized(); if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json(); const id = String(body.id ?? ''); const email = String(body.email ?? '').trim(); const full_name = String(body.full_name ?? '').trim();
  if (!id || !email || !full_name) return NextResponse.json({ error: 'User id, full name, and email are required.' }, { status: 400 });
  const admin = createAdminClient(); const { error: authError } = await admin.auth.admin.updateUserById(id, { email, user_metadata: { full_name } });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  const { error: profileError } = await admin.from('users').update({ email, full_name }).eq('id', id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const actor = await authorized(); if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json(); const id = String(body.id ?? ''); if (!id) return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
  const admin = createAdminClient(); const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
