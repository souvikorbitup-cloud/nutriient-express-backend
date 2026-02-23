import { Router } from "express";
import {
  getQuestions,
  getSession,
  syncProgress,
  deleteSessionById,
  getReportById,
  getUserSession,
  getAllQuizReports,
} from "../controllers/quiz.controller.js";
import authorizeRole from "../middlewares/role.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/* -------- User -------- */
router.get("/session/:id", getSession);
router.delete("/session/:id", deleteSessionById);
router.get("/user/session", getUserSession);
router.get("/questions", getQuestions);
router.post("/sync", syncProgress);
router.get("/report/:id", getReportById);

/* -------- Admin / Manager -------- */
router.use(verifyJWT);
router.use(authorizeRole("admin", "manager"));

router.get("/admin/reports", getAllQuizReports);

export default router;
