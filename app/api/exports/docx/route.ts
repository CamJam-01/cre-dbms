import { NextResponse } from 'next/server';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function valuesForRows(rows: Array<{ values: Record<string, unknown> }>) {
  const keys = new Set(rows.flatMap(row => Object.keys(row.values)));
  return Object.fromEntries([...keys].map(key => [key, rows.map(row => {
    const value = row.values[key];
    return Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '' : String(value);
  }).join('\n---\n')]));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('You must be signed in.', { status: 401 });
  const body = await request.json() as { tableId?: string; templateId?: string; rowIds?: string[] };
  if (!body.tableId || !body.templateId || !body.rowIds?.length) return new NextResponse('Choose a table, template, and at least one record.', { status: 400 });
  const [{ data: template, error: templateError }, { data: rows, error: rowError }] = await Promise.all([
    supabase.from('docx_templates').select('*').eq('id', body.templateId).eq('table_id', body.tableId).single(),
    supabase.from('data_table_rows').select('values').eq('table_id', body.tableId).in('id', body.rowIds),
  ]);
  if (templateError || !template) return new NextResponse(templateError?.message ?? 'Template not found.', { status: 404 });
  if (rowError || !rows?.length) return new NextResponse(rowError?.message ?? 'No records found.', { status: 404 });
  const download = await supabase.storage.from('docx-templates').download(template.storage_path);
  if (download.error || !download.data) return new NextResponse(download.error?.message ?? 'Template file could not be downloaded.', { status: 500 });
  const zip = new PizZip(Buffer.from(await download.data.arrayBuffer()));
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{{', end: '}}' } });
  const mergeValues = valuesForRows(rows as Array<{ values: Record<string, unknown> }>);
  doc.render({ ...mergeValues, record_count: rows.length, records: (rows as Array<{ values: Record<string, unknown> }>).map(row => row.values) });
  const output = doc.getZip().generate({ type: 'nodebuffer' });
  return new NextResponse(new Uint8Array(output), { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${String(template.name).replace(/[^a-zA-Z0-9._-]/g, '_')}-export.docx"` } });
}
