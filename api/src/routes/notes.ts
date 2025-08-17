import { Router } from 'express';
import { z } from "zod";
import Note from "../models/Note";
import { Queue } from 'bullmq';
import { de } from 'zod/v4/locales/index.cjs';


const router = Router();

const noteScehma = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    releaseAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format (must be ISO string)"
    }),
    webhookUrl: z.string().url(),
    delay: z.number().min(0).optional(),
});

const notesQueue = new Queue('notes', {
    connection: { url: process.env.REDIS_URL }
});


router.post("/", async (req, res) => {
    try {
        const parsed = noteScehma.parse(req.body);

        console.log(parsed.releaseAt)

        const note = await Note.create({
            title: parsed.title,
            body: parsed.body,
            webhookUrl: parsed.webhookUrl,
            releaseAt: parsed.releaseAt,
            status: "pending"
        });

        await notesQueue.add(
            'sendNote',
            { id: note._id },
            {
                delay: parsed.delay,
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
        await notesQueue.add(
            'sendNote',
            { id: note._id },
            {
                delay: 0,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            }
        )

        res.json({ message: "Note requeued", id: note._id });
        return
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
        return
    }
});


export default router;
