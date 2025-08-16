import { MongoClient, ObjectId } from 'mongodb';
import axios from "axios"
import { timeStamp } from 'console';


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
    title: string;
    body: string;
    releaseAt: Date;
    webhookUrl: string;
    status: "pending" | "delivered" | "failed" | "dead";
    attempts: Attempt[];
    deliveredAt?: Date | null;
}


const backoff = (attempt: number): number => Math.pow(2, attempt) * 1000;

async function processNotes() {
    const db = client.db(dbName);
    const notes = db.collection<Note>("notes");

    const currentTime = new Date();


    const readyNotes = await notes.find({
        releaseAt: { $lte: currentTime },
        status: "pending"
    }).toArray();


    for (const note of readyNotes) {
        try {
            const res = await axios.post(note.webhookUrl, { content: note.body }, {
                headers: {
                    "X-Webhook-Id": note._id.toString(),
                    "X-Idempotency-Key": note._id.toString()
                },
            });
            if (res.status == 200 || res.status >= 300) {
                await notes.updateOne(
                    { _id: note._id },
                    {
                        $set: { status: "delivered", deliveredAt: new Date() },
                        $push: { attempts: { at: new Date(), statusCode: res.status, ok: true } }
                    }
                );
                console.log(`delivered note ${note._id} to ${note.webhookUrl}`);
            }
        } catch (why: any) {
            const attemptsCount = note.attempts?.length || 0;

            await notes.updateOne(
                { _id: note._id },
                {
                    $push: {
                        attempts: {
                            at: new Date(),
                            statusCode: why.response?.status || 500,
                            error: why.message,
                            ok: false
                        }
                    },
                    $set: {
                        status: attemptsCount + 1 >= 3 ? "dead" : "pending"
                    }
                }
            );

            console.log(`failed send note ${note._id}, attempt ${attemptsCount + 1}`);

            if (attemptsCount + 1 < 3) {
                setTimeout(() => processSingleNote(note._id), backoff(attemptsCount));
            }
        }
    }
}


async function processSingleNote(noteId: ObjectId) {
    const db = client.db(dbName);
    const notes = db.collection<Note>("notes");
    const note = await notes.findOne({ _id: noteId })
    if (note && note.status === "pending") {
        await processNotes();
    }

}

async function main() {
    await client.connect();
    console.log("worker connected to mongodb ... ");
    setInterval(processNotes, POLL_INTERVAL)
}


main().catch(console.error);
