import express from "express"
import { Redis } from "ioredis"

const app = express();
const port = 4000;
app.use(express.json());

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

app.post('/hook', async (req, res) => {
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    if (!idempotencyKey) {
        return res.status(400).send('X-Idempotency-Key header is required.');
    }

    const setResult = await redis.setnx(`idempotency:${idempotencyKey}`, 'processed');

    if (setResult === 1) {
        console.log(`Processing new webhook with key: ${idempotencyKey}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`Successfully processed webhook: ${idempotencyKey}`);
        return res.status(200).send('OK');
    } else {
        console.log(`Received duplicate webhook with key: ${idempotencyKey}. Ignoring.`);
        return res.status(200).send('OK');
    }
});

app.get('/health', (req, res) => {
    res.status(200).send({ status: 'OK' });
});

app.listen(port, () => {
    console.log(`Sink service listening at http://localhost:${port}`);
});
