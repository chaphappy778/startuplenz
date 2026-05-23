// apps/web/components/AccountForm.tsx
//
// Small client form to update the user's display name. Email is read-only.
// changing it would require a Supabase auth flow (re-confirm), which we
// don't expose yet.

"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "@/app/account/actions";

interface AccountFormProps {
  initialName: string;
  email: string;
}

export default function AccountForm({ initialName, email }: AccountFormProps) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = name !== initialName;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError(null);

    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (result.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
        setError(result.error ?? "Couldn't save.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="account-form">
      <div className="account-field">
        <label htmlFor="display-name" className="account-field-label">
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setStatus("idle");
          }}
          placeholder="e.g. Jennifer"
          maxLength={80}
          className="account-input"
          autoComplete="name"
        />
        <span className="account-field-hint">
          Shown in the top bar when you're signed in.
        </span>
      </div>

      <div className="account-field">
        <label htmlFor="email-readonly" className="account-field-label">
          Email
        </label>
        <input
          id="email-readonly"
          type="email"
          value={email}
          readOnly
          className="account-input account-input-readonly"
        />
        <span className="account-field-hint">
          Email changes aren't supported yet, get in touch if you need this.
        </span>
      </div>

      <div className="account-form-footer">
        <button
          type="submit"
          disabled={!dirty || isPending}
          className="account-save-btn"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" && <span className="account-status-ok">Saved.</span>}
        {status === "error" && error && (
          <span className="account-status-error">{error}</span>
        )}
      </div>
    </form>
  );
}
