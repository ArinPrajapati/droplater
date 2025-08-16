import mongoose, { Schema, Document } from "mongoose";

export interface Attempt {
    at: Date;
    statusCode: number;
    ok: boolean;
    error?: string;
}

export interface INote extends Document {
    title: string;
    body: string;
    releaseAt: Date;
    webhookUrl: string;
    status: "pending" | "delivered" | "failed" | "dead";
    attempts: Attempt[];
    deliveredAt?: Date | null;
}

const AttemptSchema = new Schema<Attempt>({
    at: { type: Date, required: true },
    statusCode: { type: Number, required: true },
    ok: { type: Boolean, required: true },
    error: { type: String },
}, { _id: false });

const NoteSchema = new Schema<INote>({
    title: { type: String, required: true },
    body: { type: String, required: true },
    releaseAt: { type: Date, required: true },
    webhookUrl: { type: String, required: true },
    status: { type: String, enum: ["pending", "delivered", "failed", "dead"], default: "pending" },
    attempts: { type: [AttemptSchema], default: [] },
    deliveredAt: { type: Date, default: null },
});

NoteSchema.index({ releaseAt: 1 });
NoteSchema.index({ status: 1 });

export default mongoose.model<INote>("Note", NoteSchema);

