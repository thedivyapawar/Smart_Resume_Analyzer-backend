// Express routes for handling resume endpoints
import express from "express";
import multer from "multer";

import {
  uploadResumeHandler,
  getResumeById,
  getAllResumes,
  updateCorrectedData,
  createFlow,
  getAllFlows,
  getMatchingResumes,
  getMultipleResumes,
  getFlowById,
} from "../controllers/resume.controller.js";

const router = express.Router();
const upload = multer(); // Use in-memory file upload

// Upload new resume (file or text)
router.post("/upload", upload.single("file"), uploadResumeHandler);

// Get all resumes
router.get("/", getAllResumes);

// Get Multiple Resumes
router.post("/many", getMultipleResumes);

// Create Flow
router.post("/create-flow", createFlow);

//Get all flow
router.get("/get-all-flows", getAllFlows);

//Get matching resume by ID
router.get("/get-matching-resumes/:id", getMatchingResumes);

// Get resume by ID
router.get("/:id", getResumeById);

// Update user-corrected fields
router.put("/:id", updateCorrectedData);

// Get flow Data by ID
router.get("/get-flow/:id", getFlowById);

export default router;
