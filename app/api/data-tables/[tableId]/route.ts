import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Context = { params: Promise<{ tableId: string }> };

async function authorizedTable(tableId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: table, error: tableError } = await supabase.from('data_tables').select('id, workspace_id, slug, owner_id, is_archived').eq('id', tableId).single();
  if (tableError || !table) return { supabase, response: NextResponse.json({ error: 'Table not found.' }, { status: 404 }) };
  if (table.owner_id !== user.id) {
    const { data: member } = await supabase.from('data_table_members').select('role').eq('table_id', tableId).eq('user_id', user.id).maybeSingle();
    if (member?.role !== 'admin') return { supabase, response: NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 }) };
  }
  return { supabase, user, table };
}

export async function DELETE(_request: Request, context: Context) {
  const { tableId } = await context.params;
  const authorized = await authorizedTable(tableId);
  if ('response' in authorized) return authorized.response;
  const { supabase } = authorized;
  const { data: rows, error: rowsError } = await supabase.from('data_table_rows').select('id').eq('table_id', tableId);
  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 400 });
  const rowIds = (rows ?? []).map(row => row.id);
  if (rowIds.length) {
    const { data: images, error: imagesError } = await supabase.from('data_row_images').select('storage_path').in('row_id', rowIds);
    if (imagesError) return NextResponse.json({ error: imagesError.message }, { status: 400 });
    const paths = (images ?? []).map(image => image.storage_path);
    if (paths.length) { const { error } = await supabase.storage.from('comp-images').remove(paths); if (error) return NextResponse.json({ error: `Image cleanup failed: ${error.message}` }, { status: 400 }); }
  }
  const { data: templates, error: templatesError } = await supabase.from('docx_templates').select('storage_path').eq('table_id', tableId);
  if (templatesError) return NextResponse.json({ error: templatesError.message }, { status: 400 });
  const templatePaths = (templates ?? []).map(template => template.storage_path);
  if (templatePaths.length) { const { error } = await supabase.storage.from('docx-templates').remove(templatePaths); if (error) return NextResponse.json({ error: `Template cleanup failed: ${error.message}` }, { status: 400 }); }
  const { error: deleteError } = await supabase.from('data_tables').delete().eq('id', tableId);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function POST(_request: Request, context: Context) {
  const { tableId } = await context.params;
  const authorized = await authorizedTable(tableId);
  if ('response' in authorized) return authorized.response;
  const { supabase, table } = authorized;
  if (!table.is_archived) return NextResponse.json({ id: table.id, slug: table.slug, is_archived: false });
  const fallbackBase = `${table.slug}-${table.id.slice(0, 8)}`;
  const candidates = [table.slug, fallbackBase, `${fallbackBase}-2`, `${fallbackBase}-3`];
  for (const slug of candidates) {
    const { data, error } = await supabase.from('data_tables').update({ is_archived: false, slug }).eq('id', tableId).select('id,slug,is_archived').single();
    if (!error && data) return NextResponse.json(data);
    if (error?.code !== '23505' && !error?.message?.toLowerCase().includes('duplicate key')) return NextResponse.json({ error: error?.message || 'The table could not be restored.' }, { status: 400 });
  }
  return NextResponse.json({ error: 'The table could not be restored because its name is already in use.' }, { status: 409 });
}
