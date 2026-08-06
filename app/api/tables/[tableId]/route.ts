import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Context = { params: Promise<{ tableId: string }> };

async function authorizedTable(tableId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: table, error } = await supabase.from('data_tables').select('id,workspace_id,slug,owner_id,is_archived').eq('id', tableId).single();
  if (error || !table) return { response: NextResponse.json({ error: 'Table not found.' }, { status: 404 }) };
  const { data: member } = await supabase.from('workspace_members').select('role').eq('workspace_id', table.workspace_id).eq('user_id', user.id).maybeSingle();
  if (table.owner_id !== user.id && member?.role !== 'admin') return { response: NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 }) };
  return { supabase, table };
}

export async function DELETE(_request: Request, context: Context) {
  const { tableId } = await context.params; const authorized = await authorizedTable(tableId); if ('response' in authorized) return authorized.response;
  const { supabase } = authorized;
  const { data: rows } = await supabase.from('data_table_rows').select('id').eq('table_id', tableId);
  const rowIds = (rows ?? []).map(row => row.id);
  if (rowIds.length) { const { data: images } = await supabase.from('data_row_images').select('storage_path').in('row_id', rowIds); const paths = (images ?? []).map(image => image.storage_path); if (paths.length) await supabase.storage.from('comp-images').remove(paths); }
  const { data: templates } = await supabase.from('docx_templates').select('storage_path').eq('table_id', tableId); const templatePaths = (templates ?? []).map(template => template.storage_path); if (templatePaths.length) await supabase.storage.from('docx-templates').remove(templatePaths);
  const { error } = await supabase.from('data_tables').delete().eq('id', tableId); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json({ ok: true });
}

export async function POST(_request: Request, context: Context) {
  const { tableId } = await context.params; const authorized = await authorizedTable(tableId); if ('response' in authorized) return authorized.response;
  const { supabase, table } = authorized; if (!table.is_archived) return NextResponse.json(table);
  const candidates = [table.slug, `${table.slug}-${table.id.slice(0, 8)}`, `${table.slug}-${table.id.slice(0, 8)}-2`];
  for (const slug of candidates) { const { data, error } = await supabase.from('data_tables').update({ is_archived: false, slug }).eq('id', tableId).select('id,slug,is_archived').single(); if (!error && data) return NextResponse.json(data); if (error?.code !== '23505') return NextResponse.json({ error: error?.message ?? 'The table could not be restored.' }, { status: 400 }); }
  return NextResponse.json({ error: 'The table could not be restored because its name is already in use.' }, { status: 409 });
}
