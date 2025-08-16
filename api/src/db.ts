import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/droplater";

export const connectToDB = async () => {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
};

