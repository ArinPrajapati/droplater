import { Request, Response, NextFunction } from "express";

export const authcheck = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers["authorization"];

    const expected = `Bearer ${process.env.ADMIN_TOKEN}`;
    console.log(expected)

    if (!token || token !== expected) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    next();
};

