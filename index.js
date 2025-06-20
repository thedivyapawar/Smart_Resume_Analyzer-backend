// Importing required modules
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import resumeRoutes from "./routes/resume.routes.js";

// Load environment variables from .env file
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware setup
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse incoming JSON requests

//Health route for server
app.get("/", (req, res) => {
  res.send("Test Route is Working");
});

// API route for resume handling
app.use("/api/resumes", resumeRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running at PORT: ${PORT}`);
});