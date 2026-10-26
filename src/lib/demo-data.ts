export type MasteryStatus = "Weak" | "Medium" | "Strong" | "Not Assessed";
export type SubjectId = "machine-learning" | "mathematics" | "biology";

export type StudySubject = {
  id: SubjectId;
  name: string;
  shortName: string;
  examLabel: string;
  units: StudyUnit[];
};

export type StudyUnit = {
  id: string;
  name: string;
  topicIds: string[];
};

export type Topic = {
  id: string;
  name: string;
  subject: string;
  unit: string;
  mastery: number | null;
  status: MasteryStatus;
  nextReview: string;
  sourceCoverage: "Covered" | "Partial" | "No source";
  assessmentStatus: "Assessed" | "Not assessed";
  sourceTitle: string;
  sourceLocation: string;
  observedGap: string;
  suggestedAction: string;
  evidenceExcerpt: string;
};

export type SampleQuestion = {
  id: string;
  topicId: string;
  type: "multiple-choice" | "short-answer";
  prompt: string;
  options: string[];
  correctAnswer: string;
  source: string;
};

export type SampleAssessment = {
  id: string;
  title: string;
  date: string;
  score: string;
  topics: string;
  topicIds: string[];
};

export type DiagnosticResult = {
  id: string;
  topicId: string;
  illustrativeMastery: number;
  status: Exclude<MasteryStatus, "Not Assessed">;
  sampleCoverage: number;
  confidence: "Limited";
  evidence: string[];
};

export type RevisionActivity = {
  id: string;
  topicId: string;
  title: string;
  subject: string;
  time: string;
  duration: string;
  status: Exclude<MasteryStatus, "Not Assessed">;
  reason: string;
  source: string;
  activity: string;
};

export type StudyGoal = {
  subjectId: SubjectId;
  examName: string;
  examDate: string;
  dailyMinutes: number;
  selectedTopicIds: string[];
  sessionDuration: number;
};

export type SubjectDemoData = {
  subject: StudySubject;
  topics: Topic[];
  questions: SampleQuestion[];
  assessments: SampleAssessment[];
  diagnosticResults: DiagnosticResult[];
  revisionSessions: RevisionActivity[];
  progressTrend: { week: string; progress: number }[];
  topicProgressHistory: { attempt: string; [topicId: string]: string | number }[];
};

type TopicSeed = {
  name: string;
  unit: string;
  mastery: number | null;
  status: MasteryStatus;
  coverage: Topic["sourceCoverage"];
  gap: string;
  action: string;
  location: string;
};

type QuestionSeed = Omit<SampleQuestion, "id" | "topicId"> & { topicName: string };

function createSubject(
  subject: StudySubject,
  seeds: TopicSeed[],
  questions: QuestionSeed[],
  progress: [number, number, number],
): SubjectDemoData {
  const topics: Topic[] = seeds.map((seed, index) => ({
    id: `${subject.id}-topic-${index + 1}`,
    name: seed.name,
    subject: subject.name,
    unit: seed.unit,
    mastery: seed.mastery,
    status: seed.status,
    nextReview: seed.status === "Weak" ? "Today · sample" : seed.status === "Medium" ? "This week · sample" : "Not scheduled",
    sourceCoverage: seed.coverage,
    assessmentStatus: seed.status === "Not Assessed" ? "Not assessed" : "Assessed",
    sourceTitle: `${subject.name} study guide`,
    sourceLocation: seed.location,
    observedGap: seed.gap,
    suggestedAction: seed.action,
    evidenceExcerpt: seed.gap,
  }));
  const topicByName = new Map(topics.map((topic) => [topic.name, topic]));
  const questionSeeds: QuestionSeed[] = [
    ...questions,
    ...topics
      .filter((topic) => !questions.some((question) => question.topicName === topic.name))
      .map((topic) => ({
        topicName: topic.name,
        type: "short-answer" as const,
        prompt: `In your own words, explain one important idea about ${topic.name}.`,
        options: [],
        correctAnswer: "",
        source: `${topic.sourceTitle} · ${topic.sourceLocation}`,
      })),
  ];
  const sampleQuestions: SampleQuestion[] = questionSeeds.map(({ topicName, ...question }, index) => ({
    ...question,
    id: `${subject.id}-question-${index + 1}`,
    topicId: topicByName.get(topicName)?.id ?? topics[0].id,
  }));
  const diagnosticResults: DiagnosticResult[] = topics.flatMap((topic) => {
      if (topic.mastery === null || topic.status === "Not Assessed") return [];
      const topicQuestions = sampleQuestions.filter((question) => question.topicId === topic.id);
      return [{
        id: `${topic.id}-sample-diagnosis`,
        topicId: topic.id,
        illustrativeMastery: topic.mastery,
        status: topic.status,
        sampleCoverage: topicQuestions.length,
        confidence: "Limited",
        evidence: [
          topic.observedGap,
          `${topicQuestions.length} illustrative question${topicQuestions.length === 1 ? "" : "s"} mapped to this topic.`,
        ],
      }];
    });
  const assessedTopics = topics.filter((topic) => topic.status !== "Not Assessed");
  const assessments: SampleAssessment[] = [
    {
      id: `${subject.id}-assessment-1`,
      title: `${subject.shortName} foundations`,
      date: "Oct 24 · sample",
      score: "7 / 10 · demo",
      topics: `${Math.min(3, assessedTopics.length)} topics`,
      topicIds: assessedTopics.slice(0, 3).map((topic) => topic.id),
    },
    {
      id: `${subject.id}-assessment-2`,
      title: `${subject.shortName} concepts`,
      date: "Oct 21 · sample",
      score: "6 / 8 · demo",
      topics: `${Math.min(2, assessedTopics.length)} topics`,
      topicIds: assessedTopics.slice(1, 3).map((topic) => topic.id),
    },
  ];
  const revisionSessions: RevisionActivity[] = topics
    .filter((topic) => topic.status === "Weak" || topic.status === "Medium")
    .slice(0, 3)
    .map((topic, index) => ({
      id: `${subject.id}-revision-${index + 1}`,
      topicId: topic.id,
      title: topic.name,
      subject: subject.shortName,
      time: index === 0 ? "Today · sample" : "This week · sample",
      duration: `${20 + index * 5} min`,
      status: topic.status as "Weak" | "Medium",
      reason: topic.observedGap,
      source: `${topic.sourceTitle} · ${topic.sourceLocation}`,
      activity: topic.suggestedAction,
    }));
  const topicProgressHistory = [
    {
      attempt: "First check",
      ...Object.fromEntries(topics.map((topic, index) => [topic.id, Math.max(10, (topic.mastery ?? 0) - (index % 2 ? 12 : 15))])),
    },
    {
      attempt: "After review",
      ...Object.fromEntries(topics.map((topic) => [topic.id, topic.mastery ?? 0])),
    },
    {
      attempt: "Later check",
      ...Object.fromEntries(topics.map((topic) => [topic.id, Math.min(100, (topic.mastery ?? 0) + 12)])),
    },
  ];

  return {
    subject,
    topics,
    questions: sampleQuestions,
    assessments,
    diagnosticResults,
    revisionSessions,
    progressTrend: [
      { week: "Week 1", progress: progress[0] },
      { week: "Week 2", progress: progress[1] },
      { week: "Week 3", progress: progress[2] },
    ],
    topicProgressHistory,
  };
}

export const subjectDemoData: Record<SubjectId, SubjectDemoData> = {
  "machine-learning": createSubject(
    {
      id: "machine-learning",
      name: "Machine Learning",
      shortName: "Machine Learning",
      examLabel: "Machine Learning exam",
      units: [
        { id: "ml-foundations", name: "Supervised Learning", topicIds: ["machine-learning-topic-1", "machine-learning-topic-2"] },
        { id: "ml-trees", name: "Tree-Based Methods", topicIds: ["machine-learning-topic-3", "machine-learning-topic-4"] },
        { id: "ml-unsupervised", name: "Unsupervised Learning", topicIds: ["machine-learning-topic-5"] },
      ],
    },
    [
      { name: "Linear Regression", unit: "Supervised Learning", mastery: 78, status: "Strong", coverage: "Covered", gap: "The sample response connects a fitted line with continuous predictions.", action: "Review residual plots and compare a second example.", location: "Pages 12–18 · Model fitting" },
      { name: "Logistic Regression", unit: "Supervised Learning", mastery: 52, status: "Medium", coverage: "Covered", gap: "Interpreting the sigmoid output as a probability could use reinforcement.", action: "Trace two inputs through the sigmoid curve.", location: "Pages 19–26 · Classification" },
      { name: "Decision Trees", unit: "Tree-Based Methods", mastery: 35, status: "Weak", coverage: "Covered", gap: "The sample response confuses entropy with information gain and omits how to compare split quality.", action: "Review the information-gain section, then try a focused five-question practice set.", location: "Pages 42–47 · Entropy and information gain" },
      { name: "Random Forests", unit: "Tree-Based Methods", mastery: 64, status: "Medium", coverage: "Partial", gap: "The purpose of sampling features at each split may need another look.", action: "Compare a single tree with an ensemble example.", location: "Pages 48–53 · Ensembles" },
      { name: "Clustering", unit: "Unsupervised Learning", mastery: null, status: "Not Assessed", coverage: "No source", gap: "This topic has not been assessed, so mastery is unknown.", action: "Add a learning source and complete a diagnostic before classifying mastery.", location: "No linked section yet" },
    ],
    [
      { topicName: "Decision Trees", type: "multiple-choice", prompt: "In a decision tree, what does information gain help you compare?", options: ["How much a split reduces uncertainty", "How many features exist in the dataset", "The total number of training examples", "The depth of every possible tree"], correctAnswer: "How much a split reduces uncertainty", source: "Machine Learning study guide · p. 44 · Choosing a split" },
      { topicName: "Decision Trees", type: "short-answer", prompt: "In a sentence, how would you explain why a decision tree chooses one split over another?", options: [], correctAnswer: "", source: "Machine Learning study guide · pp. 44–46 · Entropy and information gain" },
      { topicName: "Linear Regression", type: "multiple-choice", prompt: "What does a regression model typically predict?", options: ["A continuous value", "A cluster label", "A tree depth", "A feature name"], correctAnswer: "A continuous value", source: "Machine Learning study guide · p. 15 · Regression outputs" },
    ],
    [38, 49, 61],
  ),
  mathematics: createSubject(
    {
      id: "mathematics",
      name: "Mathematics",
      shortName: "Mathematics",
      examLabel: "Mathematics exam",
      units: [
        { id: "math-algebra", name: "Algebra", topicIds: ["mathematics-topic-1", "mathematics-topic-2"] },
        { id: "math-functions", name: "Functions and Graphs", topicIds: ["mathematics-topic-3"] },
        { id: "math-data", name: "Data and Chance", topicIds: ["mathematics-topic-4", "mathematics-topic-5"] },
      ],
    },
    [
      { name: "Linear Equations", unit: "Algebra", mastery: 82, status: "Strong", coverage: "Covered", gap: "The sample work shows consistent inverse-operation steps.", action: "Try a mixed set with variables on both sides.", location: "Pages 8–13 · Solving equations" },
      { name: "Quadratic Functions", unit: "Algebra", mastery: 48, status: "Medium", coverage: "Covered", gap: "Connecting roots to a graph may need another review.", action: "Sketch a few graphs and identify their roots.", location: "Pages 22–27 · Graphs and roots" },
      { name: "Trigonometric Ratios", unit: "Functions and Graphs", mastery: 31, status: "Weak", coverage: "Partial", gap: "Choosing a ratio from a right-triangle diagram may need practice.", action: "Label a right triangle, then match each ratio to its sides.", location: "Page 38 · Right-triangle ratios" },
      { name: "Probability", unit: "Data and Chance", mastery: 56, status: "Medium", coverage: "Covered", gap: "Distinguishing independent events could be clearer.", action: "Review event independence with a worked example.", location: "Pages 54–59 · Probability" },
      { name: "Sequences", unit: "Data and Chance", mastery: null, status: "Not Assessed", coverage: "No source", gap: "This topic has not been assessed, so mastery is unknown.", action: "Add a source and take a diagnostic before drawing conclusions.", location: "No linked section yet" },
    ],
    [
      { topicName: "Quadratic Functions", type: "multiple-choice", prompt: "Where do the roots of a quadratic appear on its graph?", options: ["Where it crosses the x-axis", "At its highest point only", "Where it crosses the y-axis only", "At every point on the curve"], correctAnswer: "Where it crosses the x-axis", source: "Mathematics study guide · p. 24 · Roots and graphs" },
      { topicName: "Trigonometric Ratios", type: "short-answer", prompt: "How do you decide which sides to compare when finding a trigonometric ratio?", options: [], correctAnswer: "", source: "Mathematics study guide · p. 38 · Right-triangle ratios" },
      { topicName: "Linear Equations", type: "multiple-choice", prompt: "What operation undoes addition when isolating a variable?", options: ["Subtraction", "Multiplication", "Squaring", "Division only"], correctAnswer: "Subtraction", source: "Mathematics study guide · p. 10 · Inverse operations" },
    ],
    [42, 54, 67],
  ),
  biology: createSubject(
    {
      id: "biology",
      name: "Biology",
      shortName: "Biology",
      examLabel: "Biology exam",
      units: [
        { id: "bio-cells", name: "Cell Biology", topicIds: ["biology-topic-1", "biology-topic-2"] },
        { id: "bio-energy", name: "Energy and Systems", topicIds: ["biology-topic-3", "biology-topic-4"] },
        { id: "bio-genetics", name: "Genetics", topicIds: ["biology-topic-4"] },
        { id: "bio-ecology", name: "Ecology and Populations", topicIds: ["biology-topic-5"] },
      ],
    },
    [
      { name: "Cell Structure", unit: "Cell Biology", mastery: 81, status: "Strong", coverage: "Covered", gap: "The sample response distinguishes major organelles accurately.", action: "Review how organelles work together in a cell.", location: "Pages 4–10 · Cell structures" },
      { name: "Cellular Respiration", unit: "Energy and Systems", mastery: 48, status: "Medium", coverage: "Covered", gap: "The sequence of energy-releasing stages may need reinforcing.", action: "Order the stages and summarize each in one sentence.", location: "Pages 31–35 · Energy release" },
      { name: "Photosynthesis", unit: "Energy and Systems", mastery: 34, status: "Weak", coverage: "Partial", gap: "The sample explanation mixes up the inputs and outputs of photosynthesis.", action: "Review the reaction summary and label its inputs and outputs.", location: "Page 28 · Photosynthesis overview" },
      { name: "Genetics", unit: "Genetics", mastery: 62, status: "Medium", coverage: "Covered", gap: "Connecting genotype with observed traits could use practice.", action: "Work through a simple inheritance example.", location: "Pages 42–47 · Inheritance" },
      { name: "Ecology", unit: "Ecology and Populations", mastery: null, status: "Not Assessed", coverage: "No source", gap: "This topic has not been assessed, so mastery is unknown.", action: "Add a learning source and complete a diagnostic before classifying mastery.", location: "No linked section yet" },
    ],
    [
      { topicName: "Photosynthesis", type: "multiple-choice", prompt: "Which pair is used by plants as inputs for photosynthesis?", options: ["Carbon dioxide and water", "Oxygen and glucose", "Nitrogen and glucose", "Oxygen and water"], correctAnswer: "Carbon dioxide and water", source: "Biology study guide · p. 28 · Photosynthesis overview" },
      { topicName: "Photosynthesis", type: "short-answer", prompt: "In a sentence, describe one way light energy is involved in photosynthesis.", options: [], correctAnswer: "", source: "Biology study guide · pp. 28–30 · Light and energy" },
      { topicName: "Cell Structure", type: "multiple-choice", prompt: "Which cell structure contains most of a eukaryotic cell's genetic material?", options: ["Nucleus", "Cell membrane", "Ribosome", "Vacuole"], correctAnswer: "Nucleus", source: "Biology study guide · p. 7 · Cell structures" },
    ],
    [40, 51, 65],
  ),
};

export const SUBJECT_OPTIONS = Object.values(subjectDemoData).map(({ subject }) => subject);
export const DEFAULT_SUBJECT_ID: SubjectId = "machine-learning";
export const DEFAULT_STUDY_GOAL: StudyGoal = {
  subjectId: DEFAULT_SUBJECT_ID,
  examName: "",
  examDate: "",
  dailyMinutes: 45,
  selectedTopicIds: [],
  sessionDuration: 25,
};

export function getSubjectDemoData(subjectId: SubjectId): SubjectDemoData {
  return subjectDemoData[subjectId];
}

export function getGoalDemoData(goal: StudyGoal): SubjectDemoData {
  const data = getSubjectDemoData(goal.subjectId);
  if (!goal.selectedTopicIds.length) return data;

  const selected = new Set(goal.selectedTopicIds);
  const topics = data.topics.filter((topic) => selected.has(topic.id));
  const topicIds = new Set(topics.map((topic) => topic.id));
  const selectedAssessedTopics = topics.filter((topic) => topic.mastery !== null);
  return {
    ...data,
    subject: {
      ...data.subject,
      units: data.subject.units
        .map((unit) => ({ ...unit, topicIds: unit.topicIds.filter((id) => topicIds.has(id)) }))
        .filter((unit) => unit.topicIds.length > 0),
    },
    topics,
    questions: data.questions.filter((question) => topicIds.has(question.topicId)),
    diagnosticResults: data.diagnosticResults.filter((result) => topicIds.has(result.topicId)),
    assessments: data.assessments
      .map((assessment) => {
        const assessmentTopicIds = assessment.topicIds.filter((id) => topicIds.has(id));
        return {
          ...assessment,
          topicIds: assessmentTopicIds,
          topics: `${assessmentTopicIds.length} selected topic${assessmentTopicIds.length === 1 ? "" : "s"}`,
        };
      })
      .filter((assessment) => assessment.topicIds.length > 0),
    revisionSessions: data.revisionSessions
      .filter((session) => topicIds.has(session.topicId))
      .map((session) => ({ ...session, duration: `${goal.sessionDuration} min` })),
    topicProgressHistory: data.topicProgressHistory.map((entry) => ({
      attempt: entry.attempt,
      ...Object.fromEntries([...topicIds].map((id) => [id, entry[id] ?? 0])),
    })),
    progressTrend: selectedAssessedTopics.length
      ? data.progressTrend.map((entry, index) => {
          const sampleHistory = data.topicProgressHistory[index];
          const progress = sampleHistory
            ? Math.round(
                selectedAssessedTopics.reduce((total, topic) => total + Number(sampleHistory[topic.id] ?? 0), 0) /
                  selectedAssessedTopics.length,
              )
            : 0;
          return { ...entry, progress };
        })
      : [],
  };
}

export function getDashboardSummary(data: SubjectDemoData) {
  const assessedTopics = data.topics.filter((topic) => topic.mastery !== null);
  return {
    topicsTracked: data.topics.length,
    averageMastery: assessedTopics.length
      ? Math.round(assessedTopics.reduce((total, topic) => total + (topic.mastery ?? 0), 0) / assessedTopics.length)
      : null,
    focusTopics: data.topics.filter((topic) => topic.status === "Weak").length,
    sessionsPlanned: data.revisionSessions.length,
  };
}

export const topics = subjectDemoData[DEFAULT_SUBJECT_ID].topics;
export const progressTrend = subjectDemoData[DEFAULT_SUBJECT_ID].progressTrend;
export const topicProgressHistory = subjectDemoData[DEFAULT_SUBJECT_ID].topicProgressHistory;
export const assessments = subjectDemoData[DEFAULT_SUBJECT_ID].assessments;
export const revisionSessions = subjectDemoData[DEFAULT_SUBJECT_ID].revisionSessions;
export const assessmentQuestions = subjectDemoData[DEFAULT_SUBJECT_ID].questions;
export const dashboardSummary = getDashboardSummary(subjectDemoData[DEFAULT_SUBJECT_ID]);
