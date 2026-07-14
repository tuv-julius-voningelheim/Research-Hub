"use client";

import Link from "next/link";

import { useMemo, useState } from "react";
import { useHub } from "@/lib/store";
import type { Division } from "@/lib/types";
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
import { OrgIcon } from "@/components/icons";

export default function DivisionsPage() {
  const { state, ready, addDivision, updateDivision, removeDivision } = useHub();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Division | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Division | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const visible = useMemo(
    () =>
      state.divisions.filter((d) =>
        d.name.toLowerCase().includes(filter.toLowerCase())
      ),
    [state.divisions, filter]
  );

  function openEditor(d: Division | "new") {
    setEditing(d);
    setName(d === "new" ? "" : d.name);
    setDescription(d === "new" ? "" : (d.description ?? ""));
  }

  function save() {
    if (!name.trim()) return;
    if (editing === "new") addDivision(name.trim(), description.trim() || undefined);
    else if (editing)
      updateDivision(editing.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <input
        className={`${inputCls} max-w-md`}
        placeholder="Filter divisions…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">Divisions</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Organise research into divisions → programs → projects.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => openEditor("new")}>
          + New division
        </button>
      </div>

      {ready && visible.length === 0 ? (
        <EmptyState
          title={filter ? "Keine Treffer" : "Noch keine Divisions"}
          hint={
            filter
              ? "Filter anpassen."
              : "Lege die erste Division an, z. B. „Product Service“."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((d) => {
            const programs = state.programs.filter((p) => p.divisionId === d.id);
            const programIds = programs.map((p) => p.id);
            const projectCount = state.projects.filter((p) =>
              programIds.includes(p.programId)
            ).length;
            return (
              <Card key={d.id} className="overflow-hidden">
                <div className="h-1.5 bg-[#0a5cd5]" />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#004a99]">
                        {OrgIcon}
                      </div>
                      <div className="truncate text-base font-bold text-neutral-900">
                        {d.name}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <IconButton kind="edit" label="Edit division" onClick={() => openEditor(d)} />
                      <IconButton
                        kind="delete"
                        label="Delete division"
                        onClick={() => setConfirmDelete(d)}
                      />
                    </div>
                  </div>
                  {d.description && (
                    <p className="mt-2 text-sm text-neutral-500">{d.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <Chip tone="blue">
                      {programs.length} {programs.length === 1 ? "program" : "programs"}
                    </Chip>
                    <Chip>
                      {projectCount} {projectCount === 1 ? "project" : "projects"}
                    </Chip>
                    <span className="flex-1" />
                    <Link
                      href={`/divisions/${d.id}`}
                      className="flex items-center gap-1 rounded-lg bg-[#0057b8] px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#004a99]"
                    >
                      Open
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={editing === "new" ? "New division" : "Edit division"}
          onClose={() => setEditing(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-neutral-600">Name</label>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Product Service"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-neutral-600">
                Beschreibung (optional)
              </label>
              <textarea
                className={inputCls}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={save} disabled={!name.trim()}>
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete division" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-neutral-600">
            „{confirmDelete.name}“ wirklich löschen? Alle zugehörigen Programs und
            Projects (inkl. hochgeladener Auswertungen) werden ebenfalls entfernt.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              onClick={() => {
                removeDivision(confirmDelete.id);
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
