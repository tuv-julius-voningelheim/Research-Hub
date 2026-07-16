"use client";

// Client-side state with shared persistence:
//  - "shared" mode: structure + vaults sync to /api/state and /api/vault
//    (Vercel Blob) so the whole team sees the same workspace. Writes are
//    optimistic-concurrency-checked via a rev counter: a 409 raises the
//    `conflict` flag instead of silently overwriting foreign edits.
//  - "local" fallback (no blob configured, e.g. plain `next dev`): IndexedDB.
// IndexedDB additionally caches the last known state in both modes.
// The workspace auto-refreshes on window focus and every 60s while idle.

import { get, set } from "idb-keyval";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Division,
  EditableContent,
  ManualNote,
  NextStep,
  Program,
  Project,
  ProjectLink,
  ProjectStatus,
  ReportBlock,
  ReportPlacement,
  ShareLink,
  Vault,
} from "./types";
import { extractEditable } from "./editable";

const DB_KEY = "tuv-research-hub-v1";
// gentle polling: focus refresh covers the common case; the interval is a
// safety net. Keep it long — every check costs blob operations (quota!).
const REFRESH_INTERVAL_MS = 300_000;

export interface HubState {
  divisions: Division[];
  programs: Program[];
  projects: Project[];
  shares?: ShareLink[];
}

export type HubMode = "loading" | "local" | "shared";

const EMPTY: HubState = { divisions: [], programs: [], projects: [], shares: [] };

interface HubContextValue {
  state: HubState;
  ready: boolean;
  mode: HubMode;
  syncError: boolean;
  /** someone else changed the shared workspace since our last load */
  conflict: boolean;
  /** blob storage suspended (quota) — working locally until it recovers */
  storageDown: boolean;
  /** server workspace is empty but this browser has cached data */
  serverEmptyLocalData: boolean;
  restoreToServer: () => Promise<void>;
  reloadShared: () => Promise<void>;
  addDivision: (name: string, description?: string) => Division;
  updateDivision: (id: string, patch: Partial<Division>) => void;
  removeDivision: (id: string) => void;
  addProgram: (divisionId: string, name: string, description?: string) => Program;
  updateProgram: (id: string, patch: Partial<Program>) => void;
  removeProgram: (id: string) => void;
  addProject: (p: {
    programId: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    method?: string;
  }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  attachVault: (projectId: string, vault: Vault) => void;
  addNextStep: (projectId: string, text: string) => void;
  toggleNextStep: (projectId: string, stepId: string) => void;
  removeNextStep: (projectId: string, stepId: string) => void;
  setNotes: (projectId: string, notes: string) => void;
  addRequirement: (projectId: string, text: string) => void;
  toggleRequirement: (projectId: string, stepId: string) => void;
  removeRequirement: (projectId: string, stepId: string) => void;
  seedRequirements: (projectId: string, texts: string[]) => void;
  toggleQuoteStar: (projectId: string, noteSlug: string, key: string) => void;
  toggleQuestionHidden: (projectId: string, question: string) => void;
  // manual create / edit / delete
  upsertOverride: (projectId: string, slug: string, content: EditableContent) => void;
  resetOverride: (projectId: string, slug: string) => void;
  addManualNote: (projectId: string, content: EditableContent) => ManualNote;
  updateManualNote: (projectId: string, id: string, content: EditableContent) => void;
  removeManualNote: (projectId: string, id: string) => void;
  hideNote: (projectId: string, slug: string) => void;
  restoreNote: (projectId: string, slug: string) => void;
  applyUpload: (
    projectId: string,
    vault: Vault,
    resolutions: Record<string, "mine" | "theirs">
  ) => void;
  // research framing
  setGoals: (projectId: string, goals: string[]) => void;
  setHypotheses: (projectId: string, hypotheses: string[]) => void;
  setLinks: (projectId: string, links: ProjectLink[]) => void;
  // report blocks
  addReportBlock: (projectId: string, placement: ReportPlacement) => void;
  updateReportBlock: (projectId: string, id: string, patch: Partial<ReportBlock>) => void;
  removeReportBlock: (projectId: string, id: string) => void;
  createShare: (kind: "project" | "program" | "division", targetId: string) => ShareLink;
  removeShare: (token: string) => void;
}

const HubContext = createContext<HubContextValue | null>(null);

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** structure as sent server-side: vault payloads stripped, presence flagged */
function stripVaults(s: HubState) {
  return {
    divisions: s.divisions,
    programs: s.programs,
    shares: s.shares ?? [],
    projects: s.projects.map(({ vault, ...rest }) => ({
      ...rest,
      hasVault: !!vault,
    })),
  };
}

function isEmptyState(s: HubState | null | undefined): boolean {
  return (
    !s ||
    ((s.divisions?.length ?? 0) === 0 &&
      (s.programs?.length ?? 0) === 0 &&
      (s.projects?.length ?? 0) === 0)
  );
}

async function fetchSharedState(): Promise<
  { rev: number; state: HubState } | "down" | null
> {
  const res = await fetch("/api/state", { cache: "no-store" });
  if (res.status === 503) return "down";
  if (!res.ok) return null;
  const structure = await res.json();
  const projects: Project[] = await Promise.all(
    (structure.projects ?? []).map(async (p: Project & { hasVault?: boolean }) => {
      const { hasVault, ...rest } = p;
      if (!hasVault) return rest as Project;
      try {
        const v = await fetch(`/api/vault?projectId=${encodeURIComponent(p.id)}`, {
          cache: "no-store",
        });
        if (v.ok) return { ...rest, vault: await v.json() } as Project;
      } catch {
        // vault fetch failed — show project without analysis
      }
      return rest as Project;
    })
  );
  return {
    rev: typeof structure.rev === "number" ? structure.rev : 0,
    state: {
      divisions: structure.divisions ?? [],
      programs: structure.programs ?? [],
      projects,
      shares: structure.shares ?? [],
    },
  };
}

export function HubProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HubState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<HubMode>("loading");
  const [syncError, setSyncError] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [storageDown, setStorageDown] = useState(false);
  const [serverEmptyLocalData, setServerEmptyLocalData] = useState(false);

  const stateRef = useRef(state);
  const modeRef = useRef(mode);
  const conflictRef = useRef(conflict);
  const revRef = useRef(0);
  const pendingRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  stateRef.current = state;
  modeRef.current = mode;
  conflictRef.current = conflict;

  const applyShared = useCallback((rev: number, loaded: HubState) => {
    revRef.current = rev;
    stateRef.current = loaded;
    setState(loaded);
    void set(DB_KEY, loaded);
  }, []);

  // initial load: try shared workspace first, fall back to IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await get<HubState>(DB_KEY);
      try {
        const shared = await fetchSharedState();
        if (cancelled) return;
        if (shared === "down") {
          // storage suspended: keep the local cache, work locally, banner up
          if (saved) {
            stateRef.current = saved;
            setState(saved);
          }
          setStorageDown(true);
          setMode("local");
          setReady(true);
          return;
        }
        if (shared) {
          // guard: never clobber a non-empty local cache with an EMPTY
          // server state — surface a restore offer instead
          if (isEmptyState(shared.state) && saved && !isEmptyState(saved)) {
            revRef.current = shared.rev;
            stateRef.current = saved;
            setState(saved);
            setServerEmptyLocalData(true);
            setMode("shared");
            setReady(true);
            return;
          }
          applyShared(shared.rev, shared.state);
          setMode("shared");
          setReady(true);
          return;
        }
      } catch {
        // network/API unavailable — local mode
      }
      if (cancelled) return;
      if (saved) {
        stateRef.current = saved;
        setState(saved);
      }
      setMode("local");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyShared]);

  const reloadShared = useCallback(async () => {
    if (modeRef.current !== "shared") return;
    try {
      const shared = await fetchSharedState();
      if (shared === "down") {
        setStorageDown(true);
        return;
      }
      if (shared) {
        // same guard as on init: an empty server state never overwrites data
        if (isEmptyState(shared.state) && !isEmptyState(stateRef.current)) {
          revRef.current = shared.rev;
          setServerEmptyLocalData(true);
          return;
        }
        applyShared(shared.rev, shared.state);
        setConflict(false);
        setSyncError(false);
        setStorageDown(false);
      }
    } catch {
      setSyncError(true);
    }
  }, [applyShared]);

  // auto-refresh: window focus + gentle polling while idle
  useEffect(() => {
    if (mode !== "shared") return;

    const check = async () => {
      // don't refresh over unsaved local edits or an unresolved conflict,
      // and don't burn blob quota while the tab is in the background
      if (document.visibilityState === "hidden") return;
      if (pendingRef.current || conflictRef.current) return;
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (!res.ok) return;
        const structure = await res.json();
        const serverRev = typeof structure.rev === "number" ? structure.rev : 0;
        if (serverRev !== revRef.current) await reloadShared();
      } catch {
        // transient — next tick will retry
      }
    };

    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    const timer = setInterval(() => void check(), REFRESH_INTERVAL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [mode, reloadShared]);

  // serialize pushes: a new push waits for the in-flight one, so our own
  // rapid edits can't race each other into a spurious 409
  const inFlightRef = useRef<Promise<void> | null>(null);

  const doPush = useCallback(() => {
    const run = async () => {
      if (inFlightRef.current) await inFlightRef.current.catch(() => {});
      try {
        const res = await fetch("/api/state", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            baseRev: revRef.current,
            ...stripVaults(stateRef.current),
          }),
          // survive page navigations / tab close right after an edit
          keepalive: true,
        });
        if (res.status === 409) {
          setConflict(true);
          setSyncError(false);
        } else if (res.ok) {
          const data = await res.json();
          if (typeof data.rev === "number") revRef.current = data.rev;
          setSyncError(false);
        } else {
          setSyncError(true);
        }
      } catch {
        setSyncError(true);
      } finally {
        pendingRef.current = false;
      }
    };
    const p = run();
    inFlightRef.current = p;
    void p.finally(() => {
      if (inFlightRef.current === p) inFlightRef.current = null;
    });
  }, []);

  const pushStructure = useCallback(() => {
    if (modeRef.current !== "shared") return;
    pendingRef.current = true;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(doPush, 600);
  }, [doPush]);

  // flush a pending write immediately when the tab is hidden / navigated away,
  // so edits made moments before leaving aren't lost with the debounce timer
  useEffect(() => {
    const flush = () => {
      if (!pendingRef.current) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      doPush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => {
      window.removeEventListener("pagehide", flush);
    };
  }, [doPush]);

  const restoreToServer = useCallback(async () => {
    // push the local cache back to an empty (or recovered) server workspace
    try {
      const res = await fetch("/api/state", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseRev: revRef.current,
          ...stripVaults(stateRef.current),
        }),
      });
      if (!res.ok) {
        if (res.status === 503) setStorageDown(true);
        setSyncError(true);
        return;
      }
      const data = await res.json();
      if (typeof data.rev === "number") revRef.current = data.rev;
      // re-upload every cached vault
      for (const p of stateRef.current.projects) {
        if (!p.vault) continue;
        await fetch(`/api/vault?projectId=${encodeURIComponent(p.id)}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(p.vault),
        }).catch(() => {});
      }
      setServerEmptyLocalData(false);
      setStorageDown(false);
      setSyncError(false);
      setMode("shared");
    } catch {
      setSyncError(true);
    }
  }, []);

  const persist = useCallback(
    (next: HubState) => {
      // keep the ref in sync immediately so several mutations inside one
      // event handler (e.g. division -> program -> project seed) chain correctly
      stateRef.current = next;
      setState(next);
      void set(DB_KEY, next);
      pushStructure();
    },
    [pushStructure]
  );

  const pushVault = useCallback(async (projectId: string, vault: Vault) => {
    if (modeRef.current !== "shared") return;
    try {
      const res = await fetch(
        `/api/vault?projectId=${encodeURIComponent(projectId)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(vault),
        }
      );
      setSyncError(!res.ok);
    } catch {
      setSyncError(true);
    }
  }, []);

  const deleteVaults = useCallback((projectIds: string[]) => {
    if (modeRef.current !== "shared") return;
    for (const id of projectIds) {
      void fetch(`/api/vault?projectId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  }, []);

  const addDivision = useCallback(
    (name: string, description?: string) => {
      const d: Division = { id: uid(), name, description, createdAt: Date.now() };
      persist({ ...stateRef.current, divisions: [...stateRef.current.divisions, d] });
      return d;
    },
    [persist]
  );

  const updateDivision = useCallback(
    (id: string, patch: Partial<Division>) => {
      const s = stateRef.current;
      persist({
        ...s,
        divisions: s.divisions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      });
    },
    [persist]
  );

  const removeDivision = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const programIds = s.programs.filter((p) => p.divisionId === id).map((p) => p.id);
      const removedProjects = s.projects.filter((p) =>
        programIds.includes(p.programId)
      );
      deleteVaults(removedProjects.filter((p) => p.vault).map((p) => p.id));
      persist({
        divisions: s.divisions.filter((d) => d.id !== id),
        programs: s.programs.filter((p) => p.divisionId !== id),
        projects: s.projects.filter((p) => !programIds.includes(p.programId)),
      });
    },
    [persist, deleteVaults]
  );

  const addProgram = useCallback(
    (divisionId: string, name: string, description?: string) => {
      const p: Program = { id: uid(), divisionId, name, description, createdAt: Date.now() };
      persist({ ...stateRef.current, programs: [...stateRef.current.programs, p] });
      return p;
    },
    [persist]
  );

  const updateProgram = useCallback(
    (id: string, patch: Partial<Program>) => {
      const s = stateRef.current;
      persist({
        ...s,
        programs: s.programs.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    },
    [persist]
  );

  const removeProgram = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const removedProjects = s.projects.filter((p) => p.programId === id);
      deleteVaults(removedProjects.filter((p) => p.vault).map((p) => p.id));
      persist({
        ...s,
        programs: s.programs.filter((p) => p.id !== id),
        projects: s.projects.filter((p) => p.programId !== id),
      });
    },
    [persist, deleteVaults]
  );

  const addProject = useCallback(
    (p: {
      programId: string;
      name: string;
      description?: string;
      status: ProjectStatus;
      method?: string;
    }) => {
      const project: Project = { id: uid(), createdAt: Date.now(), ...p };
      persist({ ...stateRef.current, projects: [...stateRef.current.projects, project] });
      return project;
    },
    [persist]
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      const s = stateRef.current;
      persist({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    },
    [persist]
  );

  const removeProject = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const removed = s.projects.find((p) => p.id === id);
      if (removed?.vault) deleteVaults([id]);
      persist({ ...s, projects: s.projects.filter((p) => p.id !== id) });
    },
    [persist, deleteVaults]
  );

  const attachVault = useCallback(
    (projectId: string, vault: Vault) => {
      void pushVault(projectId, vault);
      updateProject(projectId, { vault });
    },
    [updateProject, pushVault]
  );

  const patchProject = useCallback(
    (projectId: string, fn: (p: Project) => Project) => {
      const s = stateRef.current;
      persist({
        ...s,
        projects: s.projects.map((p) => (p.id === projectId ? fn(p) : p)),
      });
    },
    [persist]
  );

  // ---- manual create / edit / delete ----

  const upsertOverride = useCallback(
    (projectId: string, slug: string, content: EditableContent) => {
      patchProject(projectId, (p) => {
        const baseNote = p.vault?.notes.find((n) => n.slug === slug);
        const prev = p.overrides?.[slug];
        return {
          ...p,
          overrides: {
            ...(p.overrides ?? {}),
            [slug]: {
              content,
              base: prev?.base ?? (baseNote ? extractEditable(baseNote) : content),
              editedAt: Date.now(),
            },
          },
        };
      });
    },
    [patchProject]
  );

  const resetOverride = useCallback(
    (projectId: string, slug: string) => {
      patchProject(projectId, (p) => {
        const next = { ...(p.overrides ?? {}) };
        delete next[slug];
        return { ...p, overrides: next };
      });
    },
    [patchProject]
  );

  const addManualNote = useCallback(
    (projectId: string, content: EditableContent) => {
      const note: ManualNote = {
        id: uid(),
        content,
        createdAt: Date.now(),
        editedAt: Date.now(),
      };
      patchProject(projectId, (p) => ({
        ...p,
        manualNotes: [...(p.manualNotes ?? []), note],
      }));
      return note;
    },
    [patchProject]
  );

  const updateManualNote = useCallback(
    (projectId: string, id: string, content: EditableContent) => {
      patchProject(projectId, (p) => ({
        ...p,
        manualNotes: (p.manualNotes ?? []).map((m) =>
          m.id === id ? { ...m, content, editedAt: Date.now() } : m
        ),
      }));
    },
    [patchProject]
  );

  const removeManualNote = useCallback(
    (projectId: string, id: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        manualNotes: (p.manualNotes ?? []).filter((m) => m.id !== id),
      }));
    },
    [patchProject]
  );

  const hideNote = useCallback(
    (projectId: string, slug: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        hiddenNotes: [...new Set([...(p.hiddenNotes ?? []), slug])],
      }));
    },
    [patchProject]
  );

  const restoreNote = useCallback(
    (projectId: string, slug: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        hiddenNotes: (p.hiddenNotes ?? []).filter((s) => s !== slug),
      }));
    },
    [patchProject]
  );

  const applyUpload = useCallback(
    (
      projectId: string,
      nextVault: Vault,
      resolutions: Record<string, "mine" | "theirs">
    ) => {
      void pushVault(projectId, nextVault);
      patchProject(projectId, (p) => {
        const newSlugs = new Set(nextVault.notes.map((n) => n.slug));
        const overrides = { ...(p.overrides ?? {}) };
        const manualNotes = [...(p.manualNotes ?? [])];

        for (const slug of Object.keys(overrides)) {
          const ov = overrides[slug];
          const newNote = nextVault.notes.find((n) => n.slug === slug);
          if (!newNote) {
            // upstream removed a note the user edited → preserve as manual
            manualNotes.push({
              id: uid(),
              content: ov.content,
              createdAt: ov.editedAt,
              editedAt: ov.editedAt,
            });
            delete overrides[slug];
            continue;
          }
          if (resolutions[slug] === "theirs") {
            delete overrides[slug];
          } else {
            // keep the edit, re-anchor its base to the new upstream content
            overrides[slug] = { ...ov, base: extractEditable(newNote) };
          }
        }

        return {
          ...p,
          vault: nextVault,
          overrides,
          manualNotes,
          // keep only hides that still exist upstream
          hiddenNotes: (p.hiddenNotes ?? []).filter((s) => newSlugs.has(s)),
        };
      });
    },
    [patchProject, pushVault]
  );

  const setGoals = useCallback(
    (projectId: string, goals: string[]) =>
      patchProject(projectId, (p) => ({ ...p, goals })),
    [patchProject]
  );
  const setHypotheses = useCallback(
    (projectId: string, hypotheses: string[]) =>
      patchProject(projectId, (p) => ({ ...p, hypotheses })),
    [patchProject]
  );
  const setLinks = useCallback(
    (projectId: string, links: ProjectLink[]) =>
      patchProject(projectId, (p) => ({ ...p, links })),
    [patchProject]
  );

  const addReportBlock = useCallback(
    (projectId: string, placement: ReportPlacement) => {
      patchProject(projectId, (p) => ({
        ...p,
        reportBlocks: [
          ...(p.reportBlocks ?? []),
          { id: uid(), title: "", body: "", placement },
        ],
      }));
    },
    [patchProject]
  );
  const updateReportBlock = useCallback(
    (projectId: string, id: string, patch: Partial<ReportBlock>) => {
      patchProject(projectId, (p) => ({
        ...p,
        reportBlocks: (p.reportBlocks ?? []).map((b) =>
          b.id === id ? { ...b, ...patch } : b
        ),
      }));
    },
    [patchProject]
  );
  const removeReportBlock = useCallback(
    (projectId: string, id: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        reportBlocks: (p.reportBlocks ?? []).filter((b) => b.id !== id),
      }));
    },
    [patchProject]
  );

  const addNextStep = useCallback(
    (projectId: string, text: string) => {
      const step: NextStep = { id: uid(), text, done: false, createdAt: Date.now() };
      patchProject(projectId, (p) => ({
        ...p,
        nextSteps: [...(p.nextSteps ?? []), step],
      }));
    },
    [patchProject]
  );

  const toggleNextStep = useCallback(
    (projectId: string, stepId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        nextSteps: (p.nextSteps ?? []).map((st) =>
          st.id === stepId ? { ...st, done: !st.done } : st
        ),
      }));
    },
    [patchProject]
  );

  const removeNextStep = useCallback(
    (projectId: string, stepId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        nextSteps: (p.nextSteps ?? []).filter((st) => st.id !== stepId),
      }));
    },
    [patchProject]
  );

  const setNotes = useCallback(
    (projectId: string, notes: string) => {
      patchProject(projectId, (p) => ({ ...p, notes }));
    },
    [patchProject]
  );

  const addRequirement = useCallback(
    (projectId: string, text: string) => {
      const step: NextStep = { id: uid(), text, done: false, createdAt: Date.now() };
      patchProject(projectId, (p) => ({
        ...p,
        requirements: [...(p.requirements ?? []), step],
      }));
    },
    [patchProject]
  );

  const toggleRequirement = useCallback(
    (projectId: string, stepId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        requirements: (p.requirements ?? []).map((st) =>
          st.id === stepId ? { ...st, done: !st.done } : st
        ),
      }));
    },
    [patchProject]
  );

  const removeRequirement = useCallback(
    (projectId: string, stepId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        requirements: (p.requirements ?? []).filter((st) => st.id !== stepId),
      }));
    },
    [patchProject]
  );

  const seedRequirements = useCallback(
    (projectId: string, texts: string[]) => {
      patchProject(projectId, (p) => {
        const existing = new Set((p.requirements ?? []).map((r) => r.text));
        const added = texts
          .filter((t) => !existing.has(t))
          .map((text, i) => ({
            id: uid() + i.toString(36),
            text,
            done: false,
            createdAt: Date.now(),
          }));
        return { ...p, requirements: [...(p.requirements ?? []), ...added] };
      });
    },
    [patchProject]
  );

  const toggleQuoteStar = useCallback(
    (projectId: string, noteSlug: string, key: string) => {
      patchProject(projectId, (p) => {
        const map = { ...(p.starredQuotes ?? {}) };
        const list = map[noteSlug] ?? [];
        map[noteSlug] = list.includes(key)
          ? list.filter((k) => k !== key)
          : [...list, key];
        if (map[noteSlug].length === 0) delete map[noteSlug];
        return { ...p, starredQuotes: map };
      });
    },
    [patchProject]
  );

  const toggleQuestionHidden = useCallback(
    (projectId: string, question: string) => {
      patchProject(projectId, (p) => {
        const hidden = p.hiddenQuestions ?? [];
        return {
          ...p,
          hiddenQuestions: hidden.includes(question)
            ? hidden.filter((q) => q !== question)
            : [...hidden, question],
        };
      });
    },
    [patchProject]
  );

  const createShare = useCallback(
    (kind: "project" | "program" | "division", targetId: string) => {
      const share: ShareLink = {
        token: uid() + uid(),
        kind,
        targetId,
        createdAt: Date.now(),
      };
      const s = stateRef.current;
      persist({ ...s, shares: [...(s.shares ?? []), share] });
      return share;
    },
    [persist]
  );

  const removeShare = useCallback(
    (token: string) => {
      const s = stateRef.current;
      persist({ ...s, shares: (s.shares ?? []).filter((sh) => sh.token !== token) });
    },
    [persist]
  );

  return (
    <HubContext.Provider
      value={{
        state,
        ready,
        mode,
        syncError,
        conflict,
        storageDown,
        serverEmptyLocalData,
        restoreToServer,
        reloadShared,
        addDivision,
        updateDivision,
        removeDivision,
        addProgram,
        updateProgram,
        removeProgram,
        addProject,
        updateProject,
        removeProject,
        attachVault,
        addNextStep,
        toggleNextStep,
        removeNextStep,
        setNotes,
        addRequirement,
        toggleRequirement,
        removeRequirement,
        seedRequirements,
        toggleQuoteStar,
        toggleQuestionHidden,
        upsertOverride,
        resetOverride,
        addManualNote,
        updateManualNote,
        removeManualNote,
        hideNote,
        restoreNote,
        applyUpload,
        setGoals,
        setHypotheses,
        setLinks,
        addReportBlock,
        updateReportBlock,
        removeReportBlock,
        createShare,
        removeShare,
      }}
    >
      {children}
    </HubContext.Provider>
  );
}

export function useHub(): HubContextValue {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used inside HubProvider");
  return ctx;
}

// -- derived helpers --

export function programOf(state: HubState, project: Project): Program | undefined {
  return state.programs.find((p) => p.id === project.programId);
}

export function divisionOf(state: HubState, project: Project): Division | undefined {
  const prog = programOf(state, project);
  return prog ? state.divisions.find((d) => d.id === prog.divisionId) : undefined;
}
