import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static("public"));

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Send Discord message
async function sendToDiscord(msg) {
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: msg })
    });
  } catch (err) {
    console.error("Discord Error:", err);
  }
}

// Fetch all timers
app.get("/api/timers", async (req, res) => {
  const result = await pool.query("SELECT * FROM boss_timers ORDER BY next_spawn ASC");
  res.json(result.rows);
});

// Add a timer
app.post("/api/timers", async (req, res) => {
  const { name, location, acquired, nextSpawn } = req.body;
  await pool.query(
    "INSERT INTO boss_timers (name, location, acquired, next_spawn) VALUES ($1,$2,$3,$4)",
    [name, location, acquired, nextSpawn]
  );
  res.sendStatus(200);
});

// Delete timer
app.delete("/api/timers/:id", async (req, res) => {
  await pool.query("DELETE FROM boss_timers WHERE id=$1", [req.params.id]);
  res.sendStatus(200);
});

// Clear all
app.delete("/api/clear", async (req, res) => {
  await pool.query("DELETE FROM boss_timers");
  res.sendStatus(200);
});

// Auto Discord notifications every minute
setInterval(async () => {
  const now = new Date();
  const result = await pool.query("SELECT * FROM boss_timers");
  for (const t of result.rows) {
    const remain = new Date(t.next_spawn) - now;

    // 10-minute warning
    if (remain <= 10 * 60 * 1000 && !t.warned10) {
      await sendToDiscord(`${t.name} spawns in 10 minutes at ${t.location}`);
      await pool.query("UPDATE boss_timers SET warned10 = true WHERE id=$1", [t.id]);
    }

    // Spawned
    if (remain <= 0 && !t.announced) {
      await sendToDiscord(`${t.name} has spawned at ${t.location}`);
      await pool.query("UPDATE boss_timers SET announced = true WHERE id=$1", [t.id]);
    }
  }
}, 60000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
