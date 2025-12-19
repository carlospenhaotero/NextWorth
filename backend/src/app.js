import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import marketRouter from "./routes/market.routes.js";
import portfolioRouter from "./routes/portfolio.routes.js";



const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas de prueba
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "NextWorth backend funcionando 🚀" });
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    console.error("Error en /db-test:", err);
    res.status(500).json({ status: "error", error: err.message });
  }
});

// Rutas reales
app.use("/api/auth", authRouter);
app.use("/api", userRouter);
app.use("/api", portfolioRouter);
app.use("/api/market", marketRouter);

export default app;
  