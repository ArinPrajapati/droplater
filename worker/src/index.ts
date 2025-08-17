import { MongoClient, ObjectId } from 'mongodb';
import axios from "axios"
import { timeStamp } from 'console';
import { tryCatch, Worker } from "bullmq"
import * as cr from "crypto"


const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/droplater";
const client = new MongoClient(MONGO_URL);

const dbName = "droplater";

const POLL_INTERVAL = 5000;

export interface Attempt {
    at: Date;
    statusCode: number;
    ok: boolean;
    error?: string;
}

export interface Note {
    _id: ObjectId;
    title: string;
    body: string;
    releaseAt: Date;
    webhookUrl: string;
    status: "pending" | "delivered" | "failed" | "dead";
    attempts: Attempt[];
    deliveredAt?: Date | null;
}


async function main() {
    await client.connect();
    console.log('Worker is listening for jobs...');

    const worker = new Worker("notes", async job => {
        const noteId = job.data.id;
        const db = client.db(dbName);
        const notes = db.collection<Note>("notes");


        console.log("processing note", noteId);

        const note = await notes.findOne<Note>({ _id: new ObjectId(noteId) });

        if (!note) {
            throw new Error(`Note with ID ${noteId} not found`);
        }

        try {
            const res = await axios.post(note.webhookUrl, { content: note.body }, {
                headers: {
                    "X-Note-Id": note._id.toString(),
                    "X-Idempotency-Key": note._id.toString(),
                },
            });

            const attempt: Attempt = {
                at: new Date(),
                statusCode: res.status,
                ok: true
            };
            await notes.updateOne(
                { _id: note._id },
                {
                    $set: { status: 'delivered', deliveredAt: new Date() },
                    $push: { attempts: attempt }
                }
            );
            console.log(`Delivered note ${note._id} to ${note.webhookUrl} with status ${res.status}`);
        } catch (why: any) {
            console.error(`Failed to deliver note ${note._id}: ${why.message}`);

            await notes.updateOne(
                { _id: note._id },
                { $push: { attempts: { at: new Date(), statusCode: why.response?.status, ok: false, error: why.message } } }
            );
            throw why;
        }
    }, {
        connection: { url: process.env.REDIS_URL || "redis://redis:6379" }

    });


    worker.on('failed', async (job, err) => {
        if (!job) return;

        const db = client.db('droplater');
        const notes = db.collection<Note>('notes');

        if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
            await notes.updateOne(
                { _id: new ObjectId(job.data.id) },
                { $set: { status: 'dead' } }
            );
            console.log(`Note ${job.data.id} is now dead after all retries failed.`);
        } else {
            console.log(`Retrying note ${job.data.id}, attempt ${job.attemptsMade}.`);
        }
    });
}

main().catch(console.error)
