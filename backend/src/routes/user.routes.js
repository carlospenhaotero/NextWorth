// src/routes/user.routes.js

import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { updateUserSettings } from "../controllers/userController.js";

const router = Router();

// GET /api/me  (ruta protegida de prueba)
router.get("/me", authRequired, (req, res) => {
  res.json({
    message: "Ruta protegida OK",
    user: req.user,
  });
});

// PATCH /api/user/settings  (cambiar moneda base, etc.)
router.patch("/user/settings", authRequired, updateUserSettings);

export default router;
