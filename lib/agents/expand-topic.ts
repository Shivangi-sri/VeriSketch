import { generateStructured } from "@/lib/llm/provider";
import type { TopicExpansion } from "@/lib/types";

const topicExpansionSchema = {
  type: "OBJECT",
  properties: {
    topic: { type: "STRING" },
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          order: { type: "NUMBER" },
          title: { type: "STRING" },
          explanation: { type: "STRING" },
        },
        required: ["id", "order", "title", "explanation"],
      },
    },
  },
  required: ["topic", "sections"],
} as const;

export async function expandTopic(topic: string): Promise<TopicExpansion> {
  const text = topic.trim();

  if (!text) {
    throw new Error("Topic is required.");
  }

  const prompt = `Given the topic below, identify 3 to 6 important sub-concepts a learner should understand in a sensible teaching order. Return only valid JSON matching the schema.

The output should be practical, educational, and grounded in the topic itself. Each section must include a short title and a clear explanation paragraph (2-4 sentences) written as a real concept definition, not a vague summary. Explain what the concept is, what it does, and how it works in simple educational language.

The content must be specific to the topic supplied. Do not assume a fixed template, do not hardcode examples, and do not force React or any other domain-specific framing unless it is genuinely relevant to the user's topic.

Topic: ${text}`;

  const result = await generateStructured<TopicExpansion>(prompt, topicExpansionSchema as Record<string, unknown>);

  if (!result || !Array.isArray(result.sections) || result.sections.length === 0) {
    throw new Error("The LLM did not return any topic sections for this prompt.");
  }

  return {
    topic: text,
    sections: result.sections
      .slice(0, 6)
      .map((section, index) => ({
        ...section,
        order: index + 1,
        title: section.title.trim() || `Section ${index + 1}`,
        explanation: section.explanation.trim() || `This section explains the most important ideas around ${text}.`,
      })),
  };
}
