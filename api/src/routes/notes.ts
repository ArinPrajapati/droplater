import { Router } from 'express';
import { z } from "zod";
import Note from "../models/Note";
import { tryCatch } from 'bullmq';


const router = Router();

const noteScehma = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    releaseAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format (must be ISO string)"
    }),
    webhookUrl: z.string().url()
});


router.post("/", async (req, res) => {
    try {
        const parsed = noteScehma.parse(req.body);

        const note = await Note.create({
            ...parsed,
            releaseAt: new Date(parsed.releaseAt),
            status: "pending"
        });
        res.status(201).json({ id: note._id })
        return
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid request data", details: err.errors });
        }
        res.status(500).json({ error: "Internal server error" });
        return
    }
})


// get /api/notes?status=pending
router.get("/", async (req, res) => {
    try {
        const status = req.query.status as string | undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = 20;

        const filter: any = {};
        if (status) filter.status = status;

        const notes = await Note.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ releaseAt: -1 });

        return res.json({ notes });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error" });
    }
});


// post /api/notes/:id/replay
router.post("/:id/replay", async (req, res) => {
    try {
        const { id } = req.params;

        const note = await Note.findById(id);
        if (!note) return res.status(404).json({ error: "Note not found" });

        if (note.status === "delivered" || note.status === "pending") {
            return res.status(400).json({ error: "Note cannot be replayed" });
        }

        note.status = "pending";
        note.attempts = [];
        await note.save();

        return res.json({ message: "Note requeued", id: note._id });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error" });
    }
});


export default router;
