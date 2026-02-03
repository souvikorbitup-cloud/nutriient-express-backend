import { Router } from "express";
import {
  createContact,
  deleteContact,
  getAllContacts,
  getContactById,
} from "../controllers/contact.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizeRole from "../middlewares/role.middleware.js";

const router = Router();

router.post("/", createContact);

/* -------- Admin / Manager -------- */
router.use(verifyJWT, authorizeRole("admin", "manager"));

router.get("/", getAllContacts);
router.get("/:contactId", getContactById);
router.delete("/:contactId", deleteContact);

export default router;
