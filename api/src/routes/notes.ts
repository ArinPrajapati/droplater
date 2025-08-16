import { Router } from 'express';
import { z } from "zod";
import Note from "../models/Note";
import { tryCatch } from 'bullmq';
import { Queue } from 'bullmq';


const router = Router();

const noteScehma = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    releaseAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format (must be ISO string)"
    }),
    webhookUrl: z.string().url()
});

const notesQueue = new Queue('notes', {
    connection: { host: 'redis', url: process.env.REDIS_URL }
});


router.post("/", async (req, res) => {
    try {
        const parsed = noteScehma.parse(req.body);

        const note = await Note.create({
            ...parsed,
            releaseAt: new Date(parsed.releaseAt),
            status: "pending"
        });


        await notesQueue.add(
            'sendNote',
            { id: note._id },
            {
                delay: note.releaseAt.getTime() - Date.now(),
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            }
        )

        res.status(201).json({ id: note._id })
        return
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid request data", details: err });
            return
        }
        res.status(500).json({ error: "Internal server error", err });
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

        res.json({ notes });
        return
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
        return
    }
});


// post /api/notes/:id/replay
router.post("/:id/replay", async (req, res) => {
    try {
        const { id } = req.params;

        const note = await Note.findById(id);
        if (!note) {
            res.status(404).json({ error: "Note not found" });
            return
        }

        if (note.status === "delivered" || note.status === "pending") {
            res.status(400).json({ error: "Note cannot be replayed" });
            return
        }

        note.status = "pending";
        note.attempts = [];
        await note.save();

        res.json({ message: "Note requeued", id: note._id });
        return
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
        return
    }
});


export default router;
