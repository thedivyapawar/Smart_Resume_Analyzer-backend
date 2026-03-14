// Resume extraction using Google Gemini (free tier)
import { extractWithGemini } from "./gemini.service.js";
import dotenv from "dotenv";

dotenv.config();

export async function extractResume(resumeText) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/app/apikey"
    );
  }
  return extractWithGemini(resumeText);
}
