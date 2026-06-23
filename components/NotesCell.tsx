"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotesCellProps {
  rowNumber: number;
  notes: string;
  writeBackEnabled: boolean;
  onChange: (rowNumber: number, newNotes: string) => void;
}

export function NotesCell({ rowNumber, notes, writeBackEnabled, onChange }: NotesCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isEditing) {
    return (
      <button
        onClick={() => {
          setDraft(notes);
          setIsEditing(true);
        }}
        className="group flex max-w-[220px] flex-col items-start gap-0.5 text-left"
        title={notes || "Add a note"}
      >
        <span className="flex items-center gap-1.5 text-[13px] text-muted group-hover:text-ink">
          <span className="truncate">{notes || "—"}</span>
          <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
        </span>
        {!writeBackEnabled && <span className="text-[10px] text-muted/70">not saved to sheet</span>}
      </button>
    );
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${rowNumber}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save note.");
      onChange(rowNumber, draft);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex w-[220px] flex-col gap-1.5">
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-border bg-surface p-1.5 text-[13px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      />
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="primary" onClick={save} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
          <X className="h-3 w-3" />
        </Button>
        {!writeBackEnabled && <span className="text-[10px] text-muted">not saved to sheet</span>}
      </div>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}
