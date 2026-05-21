"use client";

// apps/web/components/admin/InputsEditor.tsx
// Inline-edit each row's default_value / min / max / step / label. Saves
// individually so a typo on one row doesn't lose work on the others.

import { useState, useTransition } from "react";
import { updateInputField } from "@/lib/actions/admin";

export interface EditableInput {
  id: string;
  input_key: string;
  display_label: string;
  unit_label: string;
  default_value: number;
  min_value: number;
  max_value: number;
  step_size: number;
  formula_key: string;
  is_live_data: boolean;
  sort_order: number;
  help_text: string;
}

type Field =
  | "default_value"
  | "min_value"
  | "max_value"
  | "step_size"
  | "display_label"
  | "unit_label"
  | "help_text";

interface Props {
  rows: EditableInput[];
  verticalSlug: string;
}

interface RowStatus {
  saving: boolean;
  flash: "saved" | "error" | null;
  error?: string;
}

export default function InputsEditor({ rows: initialRows }: Props) {
  const [rows, setRows] = useState<EditableInput[]>(initialRows);
  const [status, setStatus] = useState<Record<string, RowStatus>>({});
  const [, startTransition] = useTransition();

  function commit(rowId: string, field: Field, value: string | number) {
    setStatus((s) => ({ ...s, [rowId]: { saving: true, flash: null } }));
    startTransition(async () => {
      const result = await updateInputField({ inputId: rowId, field, value });
      if (result.ok) {
        setStatus((s) => ({ ...s, [rowId]: { saving: false, flash: "saved" } }));
        setTimeout(() => {
          setStatus((s) => ({ ...s, [rowId]: { ...s[rowId], flash: null } }));
        }, 1500);
      } else {
        setStatus((s) => ({
          ...s,
          [rowId]: {
            saving: false,
            flash: "error",
            error: result.error,
          },
        }));
      }
    });
  }

  function updateLocal(rowId: string, field: keyof EditableInput, value: string | number | boolean) {
    setRows((rs) =>
      rs.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    );
  }

  return (
    <div className="admin-inputs-wrap">
      <table className="admin-inputs-table">
        <thead>
          <tr>
            <th>input_key</th>
            <th>Label</th>
            <th>Default</th>
            <th>Min</th>
            <th>Max</th>
            <th>Step</th>
            <th>Unit</th>
            <th>Live?</th>
            <th>Help text</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = status[r.id];
            return (
              <tr key={r.id}>
                <td className="ai-code">{r.input_key}</td>
                <td>
                  <TextField
                    value={r.display_label}
                    onLocalChange={(v) => updateLocal(r.id, "display_label", v)}
                    onCommit={(v) => commit(r.id, "display_label", v)}
                    width={210}
                  />
                </td>
                <td>
                  <NumberField
                    value={r.default_value}
                    onLocalChange={(v) => updateLocal(r.id, "default_value", v)}
                    onCommit={(v) => commit(r.id, "default_value", v)}
                  />
                </td>
                <td>
                  <NumberField
                    value={r.min_value}
                    onLocalChange={(v) => updateLocal(r.id, "min_value", v)}
                    onCommit={(v) => commit(r.id, "min_value", v)}
                  />
                </td>
                <td>
                  <NumberField
                    value={r.max_value}
                    onLocalChange={(v) => updateLocal(r.id, "max_value", v)}
                    onCommit={(v) => commit(r.id, "max_value", v)}
                  />
                </td>
                <td>
                  <NumberField
                    value={r.step_size}
                    onLocalChange={(v) => updateLocal(r.id, "step_size", v)}
                    onCommit={(v) => commit(r.id, "step_size", v)}
                  />
                </td>
                <td>
                  <TextField
                    value={r.unit_label}
                    onLocalChange={(v) => updateLocal(r.id, "unit_label", v)}
                    onCommit={(v) => commit(r.id, "unit_label", v)}
                    width={70}
                  />
                </td>
                <td className="ai-center">{r.is_live_data ? "yes" : "—"}</td>
                <td>
                  <TextField
                    value={r.help_text}
                    onLocalChange={(v) => updateLocal(r.id, "help_text", v)}
                    onCommit={(v) => commit(r.id, "help_text", v)}
                    width={260}
                  />
                </td>
                <td className="ai-status">
                  {s?.saving && <span className="ai-saving">saving…</span>}
                  {s?.flash === "saved" && <span className="ai-saved">✓ saved</span>}
                  {s?.flash === "error" && (
                    <span className="ai-error" title={s.error}>✗ {s.error}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="admin-tip">Press <kbd>Enter</kbd> or tab out of a field to save that field.</p>
    </div>
  );
}

interface FieldProps<T> {
  value: T;
  onLocalChange: (v: T) => void;
  onCommit: (v: T) => void;
}

function TextField({
  value,
  onLocalChange,
  onCommit,
  width = 160,
}: FieldProps<string> & { width?: number }) {
  return (
    <input
      type="text"
      className="ai-input"
      style={{ width }}
      value={value}
      onChange={(e) => onLocalChange(e.target.value)}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
    />
  );
}

function NumberField({ value, onLocalChange, onCommit }: FieldProps<number>) {
  return (
    <input
      type="number"
      className="ai-input ai-number"
      step="any"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        const v = e.target.value === "" ? 0 : Number(e.target.value);
        onLocalChange(v);
      }}
      onBlur={(e) => {
        const v = e.target.value === "" ? 0 : Number(e.target.value);
        onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
    />
  );
}
