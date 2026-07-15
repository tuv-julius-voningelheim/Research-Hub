"use client";

// Schema-driven editor for creating & editing notes (themes, pain points,
// needs, insights, recommendations, personas). Same form for manual notes
// and for edits on uploaded notes.

import { useEffect, useMemo, useState } from "react";
import { SCHEMA, TYPE_TITLE, emptyEditable } from "@/lib/editable";
import type { EditableContent, NoteType } from "@/lib/types";
import { Modal, btnPrimary, btnSecondary, inputCls } from "@/components/ui";

export interface RefOption {
  slug: string;
  title: string;
}

const labelCls = "mb-1 block text-xs font-semibold text-neutral-600";

export default function NoteEditor({
  type,
  initial,
  refOptions,
  onSave,
  onClose,
  onDelete,
  deleteLabel,
  title,
}: {
  type: NoteType;
  initial?: EditableContent;
  /** existing notes per ref-type for the relational selects */
  refOptions: Partial<Record<NoteType, RefOption[]>>;
  onSave: (content: EditableContent) => void;
  onClose: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  title?: string;
}) {
  const schema = SCHEMA[type];
  const [c, setC] = useState<EditableContent>(
    () => initial ?? emptyEditable(type)
  );

  useEffect(() => {
    setC(initial ?? emptyEditable(type));
  }, [initial, type]);

  const set = (patch: Partial<EditableContent>) => setC((p) => ({ ...p, ...patch }));
  const setMeta = (k: string, v: string) =>
    setC((p) => ({ ...p, meta: { ...p.meta, [k]: v } }));
  const setRef = (k: string, v: string) =>
    setC((p) => ({ ...p, refs: { ...p.refs, [k]: v } }));
  const setField = (k: string, v: string) =>
    setC((p) => ({ ...p, fields: { ...p.fields, [k]: v } }));

  const quotes = c.quotes;
  const setQuote = (i: number, patch: Partial<{ text: string; source: string }>) =>
    set({ quotes: quotes.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) });
  const addQuote = () => set({ quotes: [...quotes, { text: "", source: "" }] });
  const removeQuote = (i: number) => set({ quotes: quotes.filter((_, idx) => idx !== i) });

  const canSave = c.title.trim().length > 0;

  const heading = useMemo(
    () => title ?? `${TYPE_TITLE[type]} ${initial ? "bearbeiten" : "anlegen"}`,
    [title, type, initial]
  );

  return (
    <Modal title={heading} onClose={onClose} wide>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label className={labelCls}>Titel</label>
          <input
            className={inputCls}
            value={c.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={`Titel des ${TYPE_TITLE[type]}`}
            autoFocus
          />
        </div>

        {/* meta + refs */}
        {(schema.meta.length > 0 || schema.refs.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {schema.meta.map((m) => (
              <div key={m.key}>
                <label className={labelCls}>{m.label}</label>
                {m.options ? (
                  <select
                    className={inputCls}
                    value={c.meta[m.key] ?? ""}
                    onChange={(e) => setMeta(m.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {m.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputCls}
                    value={c.meta[m.key] ?? ""}
                    onChange={(e) => setMeta(m.key, e.target.value)}
                  />
                )}
              </div>
            ))}
            {schema.refs.map((r) => {
              const opts = refOptions[r.refType] ?? [];
              return (
                <div key={r.key}>
                  <label className={labelCls}>{r.label}</label>
                  <select
                    className={inputCls}
                    value={c.refs[r.key] ?? ""}
                    onChange={(e) => setRef(r.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {opts.map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {/* text fields */}
        {schema.fields.map((f) => (
          <div key={f.key}>
            <label className={labelCls}>{f.label}</label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-y leading-relaxed`}
              value={c.fields[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          </div>
        ))}

        {/* quotes */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={labelCls}>Belegte Zitate</label>
            <button
              type="button"
              onClick={addQuote}
              className="cursor-pointer text-xs font-semibold text-[#0057b8] hover:underline"
            >
              + Zitat
            </button>
          </div>
          <div className="space-y-2">
            {quotes.map((q, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 p-2.5">
                <textarea
                  className={`${inputCls} min-h-[54px] resize-y text-sm italic`}
                  value={q.text}
                  onChange={(e) => setQuote(i, { text: e.target.value })}
                  placeholder="Wörtliches Zitat…"
                />
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    className={`${inputCls} py-1.5 text-xs`}
                    value={q.source ?? ""}
                    onChange={(e) => setQuote(i, { source: e.target.value })}
                    placeholder="Quelle (z. B. INT-001)"
                  />
                  <button
                    type="button"
                    onClick={() => removeQuote(i)}
                    className="shrink-0 cursor-pointer rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Zitat entfernen"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {quotes.length === 0 && (
              <p className="rounded-lg bg-neutral-50 px-3 py-3 text-center text-xs text-neutral-400 ring-1 ring-neutral-200">
                Noch keine Zitate.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-4">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            {deleteLabel ?? "Löschen"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!canSave}
            onClick={() => onSave({ ...c, title: c.title.trim() })}
          >
            Speichern
          </button>
        </div>
      </div>
    </Modal>
  );
}
