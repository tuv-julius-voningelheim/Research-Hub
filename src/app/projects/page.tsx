"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { notesOf } from "@/lib/analytics";
import { divisionOf, useHub } from "@/lib/store";
import type { Project, ProjectStatus } from "@/lib/types";
import {
  Card,
  Chip,
  EmptyState,
  IconButton,
  Modal,
  StatusBadge,
  btnPrimary,
  btnSecondary,
  inputCls,
} from "@/components/ui";
import { FileIcon, FolderIcon, UsersIcon } from "@/components/icons";

export default function ProjectsPage() {
  const { state, ready, addProgram, addDivision, addProject, updateProject, removeProject } =
    useHub();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

  const [name, setName] = useState("");
  const [programId, setProgramId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planned");
  const [method, setMethod] = useState("");
  const [description, setDescription] = useState("");

  const visible = useMemo(
    () =>
      state.projects.filter((p) =>
        p.name.toLowerCase().includes(filter.toLowerCase())
      ),
    [state.projects, filter]
  );

  function openEditor(p: Project | "new") {
    setEditing(p);
    setName(p === "new" ? "" : p.name);
    setProgramId(p === "new" ? (state.programs[0]?.id ?? "") : p.programId);
    setStatus(p === "new" ? "planned" : p.status);
    setMethod(p === "new" ? "User Interviews" : (p.method ?? ""));
    setDescription(p === "new" ? "" : (p.description ?? ""));
  }

  function save() {
    if (!name.trim() || !programId) return;
    const data = {
      name: name.trim(),
      programId,
      status,
      method: method.trim() || undefined,
      description: description.trim() || undefined,
    };
    if (editing === "new") addProject(data);
    else if (editing) updateProject(editing.id, data);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <input
        className={`${inputCls} max-w-md`}
        placeholder="Filter projects…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Every research project, its master data and its uploaded second-brain export.
          </p>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            // convenience: auto-create a default structure if none exists yet
            if (state.programs.length === 0) {
              const d = state.divisions[0] ?? addDivision("Product Service");
              const pr = addProgram(d.id, "General");
              openEditor("new");
              setProgramId(pr.id);
            } else {
              openEditor("new");
            }
          }}
        >
          + New project
        </button>
      </div>

      {ready && visible.length === 0 ? (
        <EmptyState
          title={filter ? "Keine Treffer" : "Noch keine Projects"}
          hint={
            filter
              ? "Filter anpassen."
              : "Lege ein Projekt an und lade danach den Second-Brain-Export (ZIP) hoch."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => {
            const division = divisionOf(state, p);
            const interviews = notesOf(p.vault, "interview").length;
            return (
              <Card key={p.id} className="flex flex-col overflow-hidden">
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#004a99]">
                        {FolderIcon}
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
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-3 text-sm text-neutral-500">
                    {p.description || "No description."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                    {p.method && (
                      <span className="flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 2v8L4.5 20a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L14 10V2M8.5 2h7" />
                        </svg>
                        {p.method}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="text-neutral-400">{UsersIcon}</span>
                      {interviews} participants
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-neutral-400">{FileIcon}</span>
                      {p.vault?.notes.length ?? 0} files
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/60 px-4 py-2.5">
                  <Chip>{p.vault ? p.vault.name : "No upload yet"}</Chip>
                  <div className="flex items-center gap-1.5">
                    <IconButton kind="edit" label="Edit project" onClick={() => openEditor(p)} />
                    <IconButton
                      kind="delete"
                      label="Delete project"
                      onClick={() => setConfirmDelete(p)}
                    />
                    <Link
                      href={`/projects/${p.id}`}
                      className="ml-1 flex items-center gap-1 rounded-lg bg-[#004a99] px-3.5 py-1.5 text-sm font-bold text-white hover:bg-[#003b7a]"
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
          title={editing === "new" ? "New project" : "Edit project"}
          onClose={() => setEditing(null)}
        >
          {state.programs.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Lege zuerst unter <b>Divisions</b> und <b>Programs</b> die Struktur an.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-neutral-600">Name</label>
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. MACE Interviews Runde 1"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-neutral-600">Program</label>
                  <select
                    className={inputCls}
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                  >
                    {state.programs.map((pr) => {
                      const d = state.divisions.find((dv) => dv.id === pr.divisionId);
                      return (
                        <option key={pr.id} value={pr.id}>
                          {pr.name} ({d?.name ?? "—"})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-neutral-600">Status</label>
                  <select
                    className={inputCls}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  >
                    <option value="planned">Planned</option>
                    <option value="in-analysis">In analysis</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-neutral-600">Methode</label>
                <input
                  className={inputCls}
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="z. B. User Interviews"
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
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={save}
                  disabled={!name.trim() || !programId}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete project" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-neutral-600">
            „{confirmDelete.name}“ inkl. hochgeladener Auswertung wirklich löschen?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              onClick={() => {
                removeProject(confirmDelete.id);
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
