// Controller logic for uploading, fetching and updating resumes
import pdfParse from "pdf-parse";
import { pool } from "../services/db.js";
import { extractWithOpenAI } from "../services/openai.service.js";

// Upload resume (file or raw text)
export const uploadResumeHandler = async (req, res) => {
  try {
    const file = req.file; // file: from form-data
    const textInput = req.body.text; // raw text input from user
    let extractedText = "";

    // Handle PDF or text file
    if (file) {
      if (file.mimetype === "application/pdf") {
        const data = await pdfParse(file.buffer);
        extractedText = data.text;
      } else if (file.mimetype === "text/plain") {
        extractedText = file.buffer.toString("utf-8");
      } else {
        return res.status(400).json({ error: "Unsupported file type" });
      }
    }
    // Handle pasted resume text
    else if (textInput) {
      extractedText = textInput;
    } else {
      return res.status(400).json({ error: "No resume provided" });
    }

    // Extract structured info using AI
    const parsedData = await extractWithOpenAI(extractedText);

    // Save to database with corrected_data same as parsedData
    const result = await pool.query(
      "INSERT INTO resumes (original_text, parsed_data, corrected_data) VALUES ($1, $2, $2) RETURNING *",
      [extractedText, parsedData]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: "Failed to upload resume" });
  }
};

// Get multiple resumes by IDs
export async function getMultipleResumes(req, res) {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid or empty IDs array" });
  }

  try {
    const placeholders = ids.map((_, idx) => `$${idx + 1}`).join(", ");
    const result = await pool.query(
      `SELECT * FROM resumes WHERE id IN (${placeholders})`,
      ids
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching resumes by IDs:", err);
    res.status(500).json({ error: "Failed to retrieve resumes" });
  }
}

// Get a specific resume by ID
export const getResumeById = async (req, res) => {
  try {
    console.log("Req received");
    const id = req.params.id;
    const result = await pool.query("SELECT * FROM resumes WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Resume not found" });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resume" });
  }
};

// Get all resumes
export const getAllResumes = async (_, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM resumes ORDER BY created_at DESC"
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.log("Error is:", err);
    res.status(500).json({ error: "Failed to fetch resumes" });
  }
};

// Update corrected data (editable fields by user)
export const updateCorrectedData = async (req, res) => {
  try {
    const { id } = req.params;
    const { corrected_data } = req.body;

    const result = await pool.query(
      "UPDATE resumes SET corrected_data = $1 WHERE id = $2 RETURNING *",
      [corrected_data, id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update corrected data" });
  }
};

// Create a new analysis flow
export const createFlow = async (req, res) => {
  const { name, required_skills, min_experience_months, education_keywords } =
    req.body;
  try {
    const result = await pool.query(
      `INSERT INTO analysis_flows (name, required_skills, min_experience_months, education_keywords)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, required_skills, min_experience_months, education_keywords]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error inserting analysis flow:", err);
    res.status(500).json({ error: "Failed to insert flow" });
  }
};

// Get all flows
export const getAllFlows = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM analysis_flows ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.log("Error fetching flows:", err);
    res.status(500).json({ error: "Failed to fetch flows" });
  }
};

//Get Matching resumes based on flowID
export async function getMatchingResumes(req, res) {
  const flowId = req.params.id;

  try {
    const {
      rows: [flow],
    } = await pool.query("SELECT * FROM analysis_flows WHERE id = $1", [
      flowId,
    ]);

    if (!flow) return res.status(404).json({ error: "Flow not found" });

    const { rows: resumes } = await pool.query(
      "SELECT id, corrected_data FROM resumes"
    );

    const matches = resumes.map((r) => {
      const pd = r.corrected_data || {};
      const exp = parseExperienceToMonths(pd.total_experience || "0") || 0;

      // Convert resume skills to lowercase Set
      const skills = new Set((pd.skills || []).map((s) => s.toLowerCase()));

      // Normalize flow.required_skills and flow.education_keywords
      const flowSkills = (flow.required_skills || []).map((s) =>
        s.toLowerCase()
      );
      const flowEducation = (flow.education_keywords || []).map((e) =>
        e.toLowerCase()
      );

      const education = (pd.education || "").toLowerCase();

      const skillsMatch = flowSkills.every((skill) => skills.has(skill));
      const expMatch = exp >= flow.min_experience_months;
      const eduMatch = flowEducation.some((keyword) =>
        education.includes(keyword)
      );

      return {
        resume_id: r.id,
        match: skillsMatch && expMatch && eduMatch,
      };
    });

    res.json(matches.filter((m) => m.match).map((m) => m.resume_id));
  } catch (err) {
    console.error("Flow run error:", err);
    res.status(500).json({ error: "Failed to run analysis flow" });
  }
}

// Get a specific analysis flow by ID
export const getFlowById = async (req, res) => {
  const flowId = req.params.id;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM analysis_flows WHERE id = $1",
      [flowId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Flow not found" });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching flow by ID:", err);
    res.status(500).json({ error: "Failed to fetch flow" });
  }
};

// Experience string parser
function parseExperienceToMonths(exp) {
  const y = /(\d+)\s*year/.exec(exp);
  const m = /(\d+)\s*month/.exec(exp);
  return (y ? +y[1] : 0) * 12 + (m ? +m[1] : 0);
}
