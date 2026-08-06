export const FIELD_TYPES = ['text', 'long_text', 'number', 'currency', 'date', 'boolean', 'single_select', 'multi_select', 'image'] as const;
export type FieldType = typeof FIELD_TYPES[number];
export type TableRole = 'viewer' | 'editor' | 'admin';
export type WorkspaceRole = TableRole;

export type DataTable = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string;
  owner_id: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type DataTableField = {
  id: string;
  table_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  options: string[];
  display_order: number;
  is_archived: boolean;
};

export type WorkspaceMember = { id: string; workspace_id: string; user_id: string; role: WorkspaceRole; user?: { email: string; full_name: string } };
export type Workspace = { id: string; name: string; owner_id: string; created_at: string; updated_at: string };
export type WorkspaceInvitation = { id: string; workspace_id: string; email: string; role: WorkspaceRole; invited_by: string; status: string; expires_at: string; created_at: string };
export type ViewFilters = Record<string, { value?: unknown; min?: unknown; max?: unknown; from?: string; to?: string }>;
export type SavedView = { id: string; workspace_id: string; table_id: string; name: string; search_term: string; filters: ViewFilters; sort_key: string | null; sort_direction: 'asc' | 'desc'; is_shared: boolean; created_by: string; created_at: string; updated_at: string };
export type DataTableRow = { id: string; table_id: string; values: Record<string, unknown>; created_by: string; updated_by: string; created_at: string; updated_at: string; images?: DataRowImage[] };
export type DataRowImage = { id: string; row_id: string; storage_path: string; original_filename: string; mime_type: string; file_size: number; display_order: number; is_thumbnail: boolean; created_at: string };
export type DocxTemplate = { id: string; table_id: string; name: string; description: string; storage_path: string; supported_fields: string[]; uploaded_by: string; is_shared: boolean; created_at: string };

export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'table';
}

export function keyify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
}

export function valueForField(field: DataTableField, value: unknown) {
  if (field.field_type === 'number' || field.field_type === 'currency') return value === '' || value === null ? null : Number(value);
  if (field.field_type === 'boolean') return Boolean(value);
  if (field.field_type === 'multi_select') return Array.isArray(value) ? value : [];
  return value ?? '';
}

export function validateValues(fields: DataTableField[], values: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  fields.filter(field => !field.is_archived).forEach(field => {
    const value = values[field.field_key];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (field.required && empty) errors[field.field_key] = `${field.label} is required.`;
    if (field.field_type === 'number' || field.field_type === 'currency') {
      if (!empty && !Number.isFinite(Number(value))) errors[field.field_key] = `${field.label} must be a number.`;
    }
    if (field.field_type === 'single_select' && !empty && !field.options.includes(String(value))) errors[field.field_key] = `${field.label} must use a configured option.`;
    if (field.field_type === 'multi_select' && !empty && (!Array.isArray(value) || value.some(option => !field.options.includes(String(option))))) errors[field.field_key] = `${field.label} contains an invalid option.`;
  });
  return errors;
}

export function canCreate(role?: TableRole) { return role === 'admin'; }
export function canEdit(role?: TableRole) { return role === 'editor' || canCreate(role); }
export function canAdmin(role?: TableRole) { return role === 'admin'; }
