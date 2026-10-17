require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is missing.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Create database tables
async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS sos_alerts (
            id BIGSERIAL PRIMARY KEY,
            profile_id TEXT NOT NULL,
            location JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    console.log("Database tables are ready.");
}

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running"
    });
});

// Create emergency profile
app.post("/api/profile", async (req, res) => {
    try {
        const data = req.body;

        if (
            !data.fullName ||
            !data.age ||
            !data.bloodGroup ||
            !data.primaryPhone
        ) {
            return res.status(400).json({
                success: false,
                message: "Fill in all required fields."
            });
        }

        const id = crypto.randomBytes(8).toString("hex");

        const profile = {
            id,
            fullName: data.fullName,
            age: data.age,
            bloodGroup: data.bloodGroup,
            address: data.address || "",
            allergies: data.allergies || "",
            conditions: data.conditions || "",
            medications: data.medications || "",
            contacts: [
                {
                    name: data.primaryName || "Primary Contact",
                    phone: data.primaryPhone
                },
                {
                    name: data.secondaryName || "Secondary Contact",
                    phone: data.secondaryPhone || ""
                },
                {
                    name: data.tertiaryName || "Tertiary Contact",
                    phone: data.tertiaryPhone || ""
                }
            ].filter(contact => contact.phone),
            createdAt: new Date().toISOString()
        };

        await pool.query(
            `INSERT INTO profiles (id, data, created_at)
             VALUES ($1, $2::jsonb, $3)`,
            [id, JSON.stringify(profile), profile.createdAt]
        );

        res.status(201).json({
            success: true,
            profile
        });
    } catch (error) {
        console.error("Profile save error:", error);

        res.status(500).json({
            success: false,
            message: "Could not save the emergency profile."
        });
    }
});

// Retrieve profile using QR ID
app.get("/api/profile/:id", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT data FROM profiles WHERE id = $1",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Profile not found."
            });
        }

        res.json({
            success: true,
            profile: result.rows[0].data
        });
    } catch (error) {
        console.error("Profile retrieval error:", error);

        res.status(500).json({
            success: false,
            message: "Could not retrieve the profile."
        });
    }
});

// Record SOS request
app.post("/api/sos", async (req, res) => {
    try {
        const { profileId, location } = req.body;

        if (!profileId) {
            return res.status(400).json({
                success: false,
                message: "Profile ID is required."
            });
        }

        const result = await pool.query(
            "SELECT data FROM profiles WHERE id = $1",
            [profileId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Profile not found."
            });
        }

        const profile = result.rows[0].data;

        await pool.query(
            `INSERT INTO sos_alerts (profile_id, location)
             VALUES ($1, $2::jsonb)`,
            [
                profileId,
                JSON.stringify(location ?? null)
            ]
        );

        console.log("SOS request recorded for:", profile.fullName);

        res.json({
            success: true,
            message: "SOS request recorded.",
            contacts: profile.contacts
        });
    } catch (error) {
        console.error("SOS save error:", error);

        res.status(500).json({
            success: false,
            message: "Could not record the SOS request."
        });
    }
});

// Serve website pages
app.get("/{*splat}", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// Start only after database tables are ready
async function startServer() {
    try {
        await initializeDatabase();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();