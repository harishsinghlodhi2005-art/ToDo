"use strict";

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
let connectionPromise;

async function connectToDatabase() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing. Add your MongoDB Atlas connection string to .env.");
    }

    if (mongoose.connection.readyState === 1) return;
    if (!connectionPromise || mongoose.connection.readyState === 0) {
        connectionPromise = mongoose.connect(process.env.MONGODB_URI).catch(error => {
            connectionPromise = null;
            throw error;
        });
    }

    await connectionPromise;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", async (req, res, next) => {
    try {
        await connectToDatabase();
        return next();
    } catch (error) {
        console.error("Unable to connect to the database:", error.message);
        return res.status(503).json({ error: "Database connection unavailable." });
    }
});
app.use("/api/tasks", taskRoutes);

app.use("/api", (req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Request body must contain valid JSON." });
    }
    console.error("Request failed:", error);
    return res.status(500).json({ error: "An unexpected server error occurred." });
});

async function startServer() {
    await connectToDatabase();
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

if (require.main === module) {
    startServer().catch(error => {
        console.error("Unable to start the server:", error.message);
        process.exitCode = 1;
    });
}

module.exports = app;