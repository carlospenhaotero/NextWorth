// RUTAS DE AUTENTICACIÓN (EXPRESS)

import { Router } from "express";                 // EXPRESS
import { register, login } from "../controllers/authController.js";

const router = Router();                          // EXPRESS Router

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

export default router;
