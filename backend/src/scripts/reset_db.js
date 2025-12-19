import pool from "../config/db.js";

(async () => {
    try {
        const client = await pool.connect();
        console.log("✅ Conectado a PostgreSQL");

        console.log("🗑️ Eliminando tabla user_portfolio...");
        await client.query("DROP TABLE IF EXISTS user_portfolio CASCADE;");
        console.log("✅ Tabla user_portfolio eliminada.");

        client.release();
        process.exit(0);
    } catch (err) {
        console.error("❌ Error eliminando tabla:", err.message);
        process.exit(1);
    }
})();
