"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useHub } from "@/lib/store";
import type { Program } from "@/lib/types";
import {
  Card,
  Chip,
  EmptyState,
  IconButton,
  Modal,
  btnPrimary,
  btnSecondary,
  inputCls,
} from "@/components/ui";
import { ProgramIcon } from "@/components/icons";

export default function ProgramsPage() {
  const { state, ready, addProgram, updateProgram, removeProgram } = useHub();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Program | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Program | null>(null);
  const [name, setName] = useState("");
  const [divisionId, setDivisionId] = useState("");

  const visible = useMemo(
    () =>
      state.programs.filter((p) =>
        p.name.toLowerCase().includes(filter.toLowerCase())
      ),
    [state.programs, filter]
  );

  function openEditor(p: Program | "new") {
    setEditing(p);
    setName(p === "new" ? "" : p.name);
    setDivisionId(p === "new" ? (state.divisions[0]?.id ?? "") : p.divisionId);
  }

  function save() {
    if (!name.trim() || !divisionId) return;
    if (editing === "new") addProgram(divisionId, name.trim());
    else if (editing) updateProgram(editing.id, { name: name.trim(), divisionId });
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <input
        className={`${inputCls} max-w-md`}
        placeholder="Filter programs…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">Programs</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Group related projects and see their insights consolidated.
          </p>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => openEditor("new")}
          disabled={state.divisions.length === 0}
          title={state.divisions.length === 0 ? "Lege zuerst eine Division an" : undefined}
        >
          + New program
        </button>
      </div>

      {ready && visible.length === 0 ? (
        <EmptyState
          title={filter ? "Keine Treffer" : "Noch keine Programs"}
          hint={
            filter
              ? "Filter anpassen."
              : state.divisions.length === 0
                ? "Lege zuerst unter Divisions eine Division an."
                : "Lege das erste Program an, z. B. „MACE“."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => {
            const division = state.divisions.find((d) => d.id === p.divisionId);
            const projects = state.projects.filter((pr) => pr.programId === p.id);
            const files = projects.reduce(
              (sum, pr) => sum + (pr.vault?.notes.length ?? 0),
              0
            );
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#004a99]">
                      {ProgramIcon}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-neutral-900">
                        {p.name}
                      </div>
                      <div className="truncate text-xs text-neutral-500">
                        {division?.name ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <IconButton kind="edit" label="Edit program" onClick={() => openEditor(p)} />
                    <IconButton
                      kind="delete"
                      label="Delete program"
                      onClick={() => setConfirmDelete(p)}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Chip tone="blue">
                    {projects.length} {projects.length === 1 ? "project" : "projects"}
                  </Chip>
                  <Chip>{files} files</Chip>
                  <span className="flex-1" />
                  <Link
                    href={`/programs/${p.id}`}
                    className="flex items-center gap-1 rounded-xl bg-gradient-to-b from-[#0a5cd5] to-[#004a99] px-3.5 py-1.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                  >
                    Open
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={editing === "new" ? "New program" : "Edit program"}
          onClose={() => setEditing(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-neutral-600">Name</label>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. MACE"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-neutral-600">Division</label>
              <select
                className={inputCls}
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
              >
                {state.divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={save}
                disabled={!name.trim() || !divisionId}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete program" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-neutral-600">
            „{confirmDelete.name}“ wirklich löschen? Alle zugehörigen Projects (inkl.
            hochgeladener Auswertungen) werden ebenfalls entfernt.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              onClick={() => {
                removeProgram(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
