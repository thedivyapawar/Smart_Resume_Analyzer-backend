// services/openaiService.js
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

// Initialize OpenAI with the API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // must be set in your .env file
});

// Extract structured info using OpenAI
export const extractWithOpenAI = async (resumeText) => {
  //   const prompt = `
  // You are a resume parser. Extract the following structured JSON fields from the resume:
  // {
  //   "name": "",
  //   "total_experience": "",
  //   "skills": [],
  //   "recent_job_title": "",
  //   "education": "",
  //   "certifications": []
  // }

  // Resume:
  // ${resumeText}

  // Return only the JSON.
  // `;

  const prompt = `
You are a professional AI resume parser.

From the following resume text, extract and return only a JSON object with these fields:

{
  "name": "Full candidate name as it appears",
  "total_experience": "Total years and months of full-time professional work experience (e.g., '2 years 3 months')",
  "skills": ["List", "of", "technical", "skills"],
  "recent_job_title": "The most recent job title",
  "education": "Highest degree and major (e.g., 'B.Sc in Computer Science')",
  "certifications": ["List of certifications, if any"],
  "companies_worked": ["Company A", "Company B", "Company C"]  // list of distinct companies where the candidate worked
}

Instructions:
- Parse the work history carefully. Extract company names from employment sections only.
- Do not include colleges, training centers, or internship sites unless clearly professional work.
- Avoid duplicates or invalid entries.
- Return only valid JSON.

Resume:
"""
${resumeText}
"""
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // works on free tier
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    console.log("Content retrieved is: ", content);
    // Try parsing the content into JSON
    try {
      return JSON.parse(content);
    } catch (err) {
      console.warn("⚠️ JSON parse failed. Returning raw content.");
      return { raw: content }; // fallback to raw if JSON parsing fails
    }
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    throw new Error("AI extraction failed.");
  }
};
