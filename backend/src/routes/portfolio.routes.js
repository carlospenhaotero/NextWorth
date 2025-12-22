
import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import {
  upsertPosition,
  getPortfolio,
  deletePosition,
  updateTae,
} from "../controllers/portfolioController.js";

const router = Router();

// Añadir o actualizar una posición en el portfolio del usuario
// POST /api/portfolio
router.post("/portfolio", authRequired, upsertPosition);

// Obtener el portfolio del usuario con precios actuales
// GET /api/portfolio
router.get("/portfolio", authRequired, getPortfolio);

// Eliminar una posición del portfolio
// DELETE /api/portfolio/:id
router.delete("/portfolio/:id", authRequired, deletePosition);

// Actualizar solo el TAE de una posición (bond/savings)
// PATCH /api/portfolio/:id/tae
router.patch("/portfolio/:id/tae", authRequired, updateTae);

export default router;
