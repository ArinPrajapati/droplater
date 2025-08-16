import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API running on port ${PORT}`));

