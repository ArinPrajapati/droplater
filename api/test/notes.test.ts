import request from 'supertest';
import { app } from '../src/index';

describe("Notes API", () => {
    it("should return health ok", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });
    const token = "test-secret";

    it("POST /api/notes - should create a note", async () => {
        const res = await request(app)
            .post("/api/notes")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Test Note",
                body: "Hello world",
                releaseAt: new Date(Date.now() + 1000).toISOString(),
                webhookUrl: "http://localhost:4000/hook"
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
    });

    it("GET /api/notes - should list notes", async () => {
        const res = await request(app)
            .get("/api/notes?status=pending&page=1&limit=5")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.notes)).toBe(true);
    });

    it("POST /api/notes/:id/replay - should reset status", async () => {
        const noteRes = await request(app)
            .post("/api/notes")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Replay Note",
                body: "Will replay",
                releaseAt: new Date(Date.now() + 1000).toISOString(),
                webhookUrl: "http://localhost:4000/hook"
            });

        const id = noteRes.body.id;

        const replayRes = await request(app)
            .post(`/api/notes/${id}/replay`)
            .set("Authorization", `Bearer ${token}`);

        expect(replayRes.status).toBe(200);

        expect(replayRes.body.status).toBe("pending");
    });

});
