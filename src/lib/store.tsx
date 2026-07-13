"use client";

// Client-side state with shared persistence:
//  - "shared" mode: structure + vaults sync to /api/state and /api/vault
//    (Vercel Blob) so the whole team sees the same workspace.
//  - "local" fallback (no blob configured, e.g. plain `next dev`): IndexedDB.
// IndexedDB additionally caches the last known state in both modes.

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
import type { Division, Program, Project, ProjectStatus, Vault } from "./types";

const DB_KEY = "tuv-research-hub-v1";

export interface HubState {
  divisions: Division[];
  programs: Program[];
  projects: Project[];
}

export type HubMode = "loading" | "local" | "shared";

const EMPTY: HubState = { divisions: [], programs: [], projects: [] };

interface HubContextValue {
  state: HubState;
  ready: boolean;
  mode: HubMode;
  syncError: boolean;
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
}

const HubContext = createContext<HubContextValue | null>(null);

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** structure as stored server-side: vault payloads stripped, presence flagged */
function stripVaults(s: HubState) {
  return {
    divisions: s.divisions,
    programs: s.programs,
    projects: s.projects.map(({ vault, ...rest }) => ({
      ...rest,
      hasVault: !!vault,
    })),
  };
}

export function HubProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HubState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<HubMode>("loading");
  const [syncError, setSyncError] = useState(false);
  const stateRef = useRef(state);
  const modeRef = useRef(mode);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  stateRef.current = state;
  modeRef.current = mode;

  // initial load: try shared workspace first, fall back to IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (res.ok) {
          const structure = await res.json();
          const projects: Project[] = await Promise.all(
            (structure.projects ?? []).map(
              async (p: Project & { hasVault?: boolean }) => {
                const { hasVault, ...rest } = p;
                if (!hasVault) return rest as Project;
                try {
                  const v = await fetch(
                    `/api/vault?projectId=${encodeURIComponent(p.id)}`,
                    { cache: "no-store" }
                  );
                  if (v.ok) return { ...rest, vault: await v.json() } as Project;
                } catch {
                  // vault fetch failed — show project without analysis
                }
                return rest as Project;
              }
            )
          );
          if (cancelled) return;
          const loaded: HubState = {
            divisions: structure.divisions ?? [],
            programs: structure.programs ?? [],
            projects,
          };
          stateRef.current = loaded;
          setState(loaded);
          void set(DB_KEY, loaded);
          setMode("shared");
          setReady(true);
          return;
        }
      } catch {
        // network/API unavailable — local mode
      }
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
  }, []);

  const pushStructure = useCallback(() => {
    if (modeRef.current !== "shared") return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/state", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(stripVaults(stateRef.current)),
        });
        setSyncError(!res.ok);
      } catch {
        setSyncError(true);
      }
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

  return (
    <HubContext.Provider
      value={{
        state,
        ready,
        mode,
        syncError,
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
