"use client";

// Client-side state with IndexedDB persistence (idb-keyval).
// No backend required — works on any static/Vercel deployment.

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

const EMPTY: HubState = { divisions: [], programs: [], projects: [] };

interface HubContextValue {
  state: HubState;
  ready: boolean;
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

export function HubProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HubState>(EMPTY);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    get<HubState>(DB_KEY)
      .then((saved) => {
        if (saved) setState(saved);
      })
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: HubState) => {
    // keep the ref in sync immediately so several mutations inside one
    // event handler (e.g. division -> program -> project seed) chain correctly
    stateRef.current = next;
    setState(next);
    void set(DB_KEY, next);
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
      persist({
        divisions: s.divisions.filter((d) => d.id !== id),
        programs: s.programs.filter((p) => p.divisionId !== id),
        projects: s.projects.filter((p) => !programIds.includes(p.programId)),
      });
    },
    [persist]
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
      persist({
        ...s,
        programs: s.programs.filter((p) => p.id !== id),
        projects: s.projects.filter((p) => p.programId !== id),
      });
    },
    [persist]
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
      persist({ ...s, projects: s.projects.filter((p) => p.id !== id) });
    },
    [persist]
  );

  const attachVault = useCallback(
    (projectId: string, vault: Vault) => {
      updateProject(projectId, { vault });
    },
    [updateProject]
  );

  return (
    <HubContext.Provider
      value={{
        state,
        ready,
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
