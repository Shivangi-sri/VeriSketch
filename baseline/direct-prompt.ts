import { GoogleGenerativeAI } from "@google/generative-ai";

export type BaselineResult = {
  text: string;
};

export async function directPromptBaseline(sourceText: string): Promise<BaselineResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const prompt = `Turn the following source text into a concise diagram summary.\n\n${sourceText}`;
  const result = await model.generateContent(prompt);
  const response = await result.response;

  return {
    text: response.text(),
  };
}
