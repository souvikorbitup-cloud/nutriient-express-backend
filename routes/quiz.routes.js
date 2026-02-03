import { Router } from "express";
import {
  getQuestions,
  getSession,
  syncProgress,
  getUserCompletedSession,
  deleteSessionById,
  getReportById,
} from "../controllers/quiz.controller.js";

const router = Router();

/* -------- User -------- */
router.get("/session/:id", getSession);
router.delete("/session/:id", deleteSessionById);
router.get("/user/completed", getUserCompletedSession);
router.get("/questions", getQuestions);
router.post("/sync", syncProgress);
router.get("/report/:id", getReportById);

export default router;
