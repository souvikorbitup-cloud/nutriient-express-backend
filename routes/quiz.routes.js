import { Router } from "express";
import {
  getQuestions,
  getSession,
  syncProgress,
  deleteSessionById,
  getReportById,
  getUserSession,
} from "../controllers/quiz.controller.js";

const router = Router();

/* -------- User -------- */
router.get("/session/:id", getSession);
router.delete("/session/:id", deleteSessionById);
router.get("/user/session", getUserSession);
router.get("/questions", getQuestions);
router.post("/sync", syncProgress);
router.get("/report/:id", getReportById);

export default router;
