"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_STUDY_GOAL,
  type StudyGoal,
  type SubjectId,
  getGoalDemoData,
  type SubjectDemoData,
} from "@/lib/demo-data";

const STORAGE_KEY = "gapfinder-study-goal-v1";
const DEFAULT_GOAL_SNAPSHOT = JSON.stringify(DEFAULT_STUDY_GOAL);
let memorySnapshot = DEFAULT_GOAL_SNAPSHOT;
const subscribers = new Set<() => void>();

type StudyDemoContextValue = {
  goal: StudyGoal;
  data: SubjectDemoData;
  focusedTopicId: string | null;
  setGoal: (goal: StudyGoal) => void;
  setSubject: (subjectId: SubjectId) => void;
  setFocusedTopic: (topicId: string | null) => void;
};

const StudyDemoContext = createContext<StudyDemoContextValue | null>(null);

function isSubjectId(value: unknown): value is SubjectId {
  return value === "machine-learning" || value === "mathematics" || value === "biology";
}

function isStudyGoal(value: unknown): value is StudyGoal {
  if (!value || typeof value !== "object") return false;
  const goal = value as Partial<StudyGoal>;
  return (
    isSubjectId(goal.subjectId) &&
    typeof goal.examName === "string" &&
    typeof goal.examDate === "string" &&
    typeof goal.dailyMinutes === "number" &&
    Number.isFinite(goal.dailyMinutes) &&
    goal.dailyMinutes > 0 &&
    Array.isArray(goal.selectedTopicIds) &&
    goal.selectedTopicIds.every((id) => typeof id === "string") &&
    typeof goal.sessionDuration === "number" &&
    Number.isFinite(goal.sessionDuration) &&
    goal.sessionDuration > 0
  );
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      memorySnapshot = stored;
      return stored;
    }
  } catch (error) {
    console.error("Could not read the current study goal from session storage.", error);
  }
  return memorySnapshot;
}

function getServerSnapshot() {
  return DEFAULT_GOAL_SNAPSHOT;
}

function saveGoal(goal: StudyGoal) {
  const snapshot = JSON.stringify(goal);
  memorySnapshot = snapshot;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, snapshot);
  } catch (error) {
    console.error("Could not save the current study goal to session storage; keeping it for this page session.", error);
  }
  subscribers.forEach((callback) => callback());
}

function parseGoal(snapshot: string): StudyGoal {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!isStudyGoal(parsed)) return DEFAULT_STUDY_GOAL;
    const validTopicIds = new Set(
      getGoalDemoData({ ...DEFAULT_STUDY_GOAL, subjectId: parsed.subjectId }).topics.map((topic) => topic.id),
    );
    return {
      ...parsed,
      selectedTopicIds: parsed.selectedTopicIds.filter((id) => validTopicIds.has(id)),
    };
  } catch (error) {
    console.error("Could not restore the current study goal from session data.", error);
    return DEFAULT_STUDY_GOAL;
  }
}

export function StudyDemoProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const goal = useMemo(() => parseGoal(snapshot), [snapshot]);
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);

  const setGoal = useCallback((nextGoal: StudyGoal) => {
    saveGoal(nextGoal);
    setFocusedTopicId((current) =>
      getGoalDemoData(nextGoal).topics.some((topic) => topic.id === current) ? current : null,
    );
  }, []);

  const setSubject = useCallback((subjectId: SubjectId) => {
    const currentGoal = parseGoal(getSnapshot());
    saveGoal({
      ...currentGoal,
      subjectId,
      selectedTopicIds: [],
    });
    setFocusedTopicId(null);
  }, []);

  const setFocusedTopic = useCallback((topicId: string | null) => {
    const topicIsInScope = getGoalDemoData(goal).topics.some((topic) => topic.id === topicId);
    setFocusedTopicId(topicIsInScope ? topicId : null);
  }, [goal]);

  const data = useMemo(() => getGoalDemoData(goal), [goal]);
  const value = useMemo(
    () => ({ goal, data, focusedTopicId, setGoal, setSubject, setFocusedTopic }),
    [goal, data, focusedTopicId, setGoal, setSubject, setFocusedTopic],
  );

  return <StudyDemoContext.Provider value={value}>{children}</StudyDemoContext.Provider>;
}

export function useStudyDemo() {
  const context = useContext(StudyDemoContext);
  if (!context) {
    throw new Error("useStudyDemo must be used within a StudyDemoProvider.");
  }
  return context;
}
