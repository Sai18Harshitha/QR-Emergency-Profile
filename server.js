
const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;
const profiles = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running"
    });
});

// Create an emergency profile
app.post("/api/profile", (req, res) => {
    const data = req.body;

    if (!data.fullName || !data.age ||
        !data.bloodGroup || !data.primaryPhone) {
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

    profiles.set(id, profile);

    res.status(201).json({
        success: true,
        profile
    });
});

// Retrieve a profile using its QR ID
app.get("/api/profile/:id", (req, res) => {
    const profile = profiles.get(req.params.id);

    if (!profile) {
        return res.status(404).json({
            success: false,
            message: "Profile not found."
        });
    }

    res.json({
        success: true,
        profile
    });
});

// Handle SOS requests
app.post("/api/sos", (req, res) => {
    const { profileId, location } = req.body;

    const profile = profiles.get(profileId);

    if (!profile) {
        return res.status(404).json({
            success: false,
            message: "Profile not found."
        });
    }

    const alert = {
        name: profile.fullName,
        contacts: profile.contacts,
        location: location || null,
        time: new Date().toISOString()
    };

    console.log("\n===== SOS REQUEST =====");
    console.log(JSON.stringify(alert, null, 2));
    console.log("=======================\n");

    res.json({
        success: true,
        message: "SOS request recorded.",
        contacts: profile.contacts
    });
});

// Serve the website
app.get("/{*splat}", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
});