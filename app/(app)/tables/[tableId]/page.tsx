import { DataTablesClient } from '@/components/data-tables-client';
export default async function TablePage({ params }: { params: Promise<{ tableId: string }> }) { const { tableId } = await params; return <DataTablesClient mode="table" tableId={tableId} />; }
