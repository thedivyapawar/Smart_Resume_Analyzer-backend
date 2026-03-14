// Free tier: get API key at https://aistudio.google.com/app/apikey (no credit card)
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const RESUME_PROMPT = `You are a professional AI resume parser.

From the following resume text, extract and return only a JSON object with these fields:

{
  "name": "Full candidate name as it appears",
  "total_experience": "Total years and months of full-time professional work experience (e.g., '2 years 3 months')",
  "skills": ["List", "of", "technical", "skills"],
  "recent_job_title": "The most recent job title",
  "education": "Highest degree and major (e.g., 'B.Sc in Computer Science')",
  "certifications": ["List of certifications, if any"],
  "companies_worked": ["Company A", "Company B", "Company C"]
}

Instructions:
- Parse the work history carefully. Extract company names from employment sections only.
- Do not include colleges, training centers, or internship sites unless clearly professional work.
- Avoid duplicates or invalid entries.
- Return only valid JSON, no markdown or extra text.

Resume:
"""
{{RESUME_TEXT}}
"""
`;

export async function extractWithGemini(resumeText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = RESUME_PROMPT.replace("{{RESUME_TEXT}}", resumeText);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.2 },
    });

    const content = response.text?.trim() || "";
    if (!content) throw new Error("Empty response from Gemini");

    // Strip markdown code block if present
    const jsonStr = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn("⚠️ Gemini JSON parse failed. Returning raw content.");
      return { raw: content };
    }
  } catch (err) {
    console.error("❌ Gemini error:", err.message || err);
    const msg = err.message?.includes("429") || err.message?.includes("quota")
      ? "Gemini rate limit. Wait a minute or use a new API key at aistudio.google.com."
      : (err.message || "Gemini extraction failed.");
    throw new Error(msg);
  }
}
