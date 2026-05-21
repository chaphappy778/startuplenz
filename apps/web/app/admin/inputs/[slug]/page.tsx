// apps/web/app/admin/inputs/[slug]/page.tsx
// Editable table of a vertical's inputs. Inline-saves via server actions.

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InputsEditor, { type EditableInput } from "@/components/admin/InputsEditor";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminInputsEditPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: vertical } = await supabase
    .from("verticals")
    .select("id, slug, display_name, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!vertical) notFound();

  const { data: inputs } = await supabase
    .from("vertical_inputs")
    .select("id, input_key, display_label, unit_label, default_value, min_value, max_value, step_size, formula_key, is_live_data, sort_order, help_text")
    .eq("vertical_id", vertical.id)
    .order("sort_order", { ascending: true });

  const rows: EditableInput[] = (inputs ?? []).map((r) => ({
    id: r.id as string,
    input_key: r.input_key as string,
    display_label: r.display_label as string,
    unit_label: (r.unit_label ?? "") as string,
    default_value: Number(r.default_value),
    min_value: Number(r.min_value),
    max_value: Number(r.max_value),
    step_size: Number(r.step_size),
    formula_key: (r.formula_key ?? "") as string,
    is_live_data: !!r.is_live_data,
    sort_order: Number(r.sort_order ?? 0),
    help_text: (r.help_text ?? "") as string,
  }));

  return (
    <div>
      <header className="admin-header">
        <Link href="/admin/inputs" className="admin-back">← All verticals</Link>
        <h1>{vertical.display_name}</h1>
        <p className="admin-sub">
          <code>{vertical.slug}</code> · {rows.length} inputs · live-data flag indicates fields that
          can be overridden by cost snapshots
        </p>
      </header>

      <InputsEditor rows={rows} verticalSlug={vertical.slug} />
    </div>
  );
}
