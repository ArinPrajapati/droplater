import express from "express";
import dotenv from "dotenv";
import { connectToDB } from "./db";
import { authcheck } from "./middlerware/auth";
import { apiLimiter } from "./middlerware/ratelimit";
import NotesRouter from "./routes/notes";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;




app.use(express.json());

app.use(cors())

app.use("/api/notes", apiLimiter, authcheck, NotesRouter);

app.get("/health", (_, res) => res.json({ ok: true }));

connectToDB().then(() => {
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
});

export { app };
