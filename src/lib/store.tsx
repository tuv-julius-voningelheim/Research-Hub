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
  NextStep,
  Program,
  Project,
  ProjectStatus,
  ShareLink,
  Vault,
} from "./types";

const DB_KEY = "tuv-research-hub-v1";
const REFRESH_INTERVAL_MS = 60_000;

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
  createShare: (projectId: string) => ShareLink;
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

async function fetchSharedState(): Promise<{ rev: number; state: HubState } | null> {
  const res = await fetch("/api/state", { cache: "no-store" });
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
      try {
        const shared = await fetchSharedState();
        if (shared && !cancelled) {
          applyShared(shared.rev, shared.state);
          setMode("shared");
          setReady(true);
          return;
        }
      } catch {
        // network/API unavailable — local mode
      }
      if (cancelled) return;
      const saved = await get<HubState>(DB_KEY);
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
      if (shared) {
        applyShared(shared.rev, shared.state);
        setConflict(false);
        setSyncError(false);
      }
    } catch {
      setSyncError(true);
    }
  }, [applyShared]);

  // auto-refresh: window focus + gentle polling while idle
  useEffect(() => {
    if (mode !== "shared") return;

    const check = async () => {
      // don't refresh over unsaved local edits or an unresolved conflict
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

  const pushStructure = useCallback(() => {
    if (modeRef.current !== "shared") return;
    pendingRef.current = true;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
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
    }, 600);
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

  const createShare = useCallback(
    (projectId: string) => {
      const share: ShareLink = {
        token: uid() + uid(),
        projectId,
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
