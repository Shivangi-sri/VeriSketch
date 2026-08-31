import type { TopicRun } from "@/lib/types";

const topicRuns = new Map<string, TopicRun>();

export function createTopicRun(topic: string): TopicRun {
  const now = new Date().toISOString();
  const id = `topic-${Date.now()}`;
  const run: TopicRun = {
    id,
    topic,
    status: "expanding",
    source: "live",
    sections: [],
    createdAt: now,
    updatedAt: now,
  };

  topicRuns.set(id, run);
  return run;
}

export function getTopicRun(id: string): TopicRun | undefined {
  return topicRuns.get(id);
}

export function updateTopicRun(id: string, patch: Partial<TopicRun>): TopicRun | undefined {
  const existing = topicRuns.get(id);
  if (!existing) return undefined;

  const next: TopicRun = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  topicRuns.set(id, next);
  return next;
}

export function setTopicSections(id: string, sections: TopicRun["sections"]): TopicRun | undefined {
  return updateTopicRun(id, { sections });
}
