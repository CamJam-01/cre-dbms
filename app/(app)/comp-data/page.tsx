import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function CompDataCompatibilityPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('data_tables').select('id').eq('slug', 'comp-data').eq('is_archived', false).limit(1).maybeSingle();
  if (data?.id) redirect(`/data-tables/${data.id}`);
  redirect('/tables');
}
