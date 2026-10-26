import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const goalRowSchema = z.object({
  id: z.string().uuid(),
  subject_id: z.string(),
  exam_name: z.string().nullable(),
  exam_date: z.string(),
  daily_minutes: z.number().int(),
  preferred_session_duration: z.number().int(),
});

const priorityRowSchema = z.object({ topic_id: z.string() });
const subjectRowSchema = z.object({ name: z.string() });
const topicRowSchema = z.object({ id: z.string(), name: z.string() });
const profileRowSchema = z.object({ display_name: z.string() });

export class WorkspaceSchemaNotReadyError extends Error {
  constructor() {
    super("The Supabase application schema has not been applied.");
    this.name = "WorkspaceSchemaNotReadyError";
  }
}

function throwWorkspaceReadError(label: string, error: { code?: string; message: string }) {
  if (error.code === "PGRST205" || error.code === "42P01") {
    throw new WorkspaceSchemaNotReadyError();
  }
  throw new Error(`${label}: ${error.message}`);
}

export type PersistedStudyGoal = {
  id: string;
  subjectId: string;
  subjectName: string;
  examName: string | null;
  examDate: string;
  dailyMinutes: number;
  sessionDuration: number;
  topics: Array<{ id: string; name: string }>;
};

export async function getWorkspaceData() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(`Could not verify the account session: ${authError.message}`);
  if (!user) return null;

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throwWorkspaceReadError("Could not load the account profile", profileError);
  const profile = profileRowSchema.safeParse(profileData);
  if (profileData && !profile.success) throw new Error("The account profile has an unexpected format.");

  const { data: goalData, error: goalError } = await supabase
    .from("study_goals")
    .select("id,subject_id,exam_name,exam_date,daily_minutes,preferred_session_duration")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (goalError) throwWorkspaceReadError("Could not load the saved study goal", goalError);
  const parsedGoal = goalRowSchema.safeParse(goalData);
  if (goalData && !parsedGoal.success) throw new Error("The saved study goal has an unexpected format.");

  let goal: PersistedStudyGoal | null = null;
  if (parsedGoal.success) {
    const row = parsedGoal.data;
    const [{ data: subjectData, error: subjectError }, { data: priorityData, error: priorityError }] =
      await Promise.all([
        supabase.from("subjects").select("name").eq("id", row.subject_id).single(),
        supabase.from("topic_priorities").select("topic_id").eq("study_goal_id", row.id),
      ]);
    if (subjectError) throwWorkspaceReadError("Could not load the selected subject", subjectError);
    if (priorityError) throwWorkspaceReadError("Could not load topic priorities", priorityError);
    const subject = subjectRowSchema.safeParse(subjectData);
    const priorities = z.array(priorityRowSchema).safeParse(priorityData);
    if (!subject.success || !priorities.success) {
      throw new Error("The saved subject or topic priorities have an unexpected format.");
    }

    const topicIds = priorities.data.map(({ topic_id }) => topic_id);
    let topics: Array<{ id: string; name: string }> = [];
    if (topicIds.length) {
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("id,name")
        .eq("subject_id", row.subject_id)
        .in("id", topicIds)
        .order("sort_order");
      if (topicsError) throwWorkspaceReadError("Could not load selected topics", topicsError);
      const parsedTopics = z.array(topicRowSchema).safeParse(topicsData);
      if (!parsedTopics.success) throw new Error("Saved topics have an unexpected format.");
      topics = parsedTopics.data;
    }

    goal = {
      id: row.id,
      subjectId: row.subject_id,
      subjectName: subject.data.name,
      examName: row.exam_name,
      examDate: row.exam_date,
      dailyMinutes: row.daily_minutes,
      sessionDuration: row.preferred_session_duration,
      topics,
    };
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: profile.success ? profile.data.display_name : "",
    goal,
  };
}
