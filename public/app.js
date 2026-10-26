const $ = (id) => document.getElementById(id);

let currentProfile = null;
let currentLocation = null;
document.addEventListener("DOMContentLoaded", () => {
    $("profileForm").addEventListener("submit", createProfile);
    $("downloadWallpaperBtn").addEventListener("click", downloadWallpaper);

    $("showProfileBtn").addEventListener("click", () => {
        if (currentProfile) showProfile(currentProfile);
    });

    $("newProfileBtn").addEventListener("click", () => {
        $("createdView").classList.add("hidden");
        $("profileView").classList.add("hidden");
        $("createView").classList.remove("hidden");
        $("profileForm").reset();
        $("formMessage").textContent = "";
    });

    $("sosBtn").addEventListener("click", sendSOS);
    $("locationBtn").addEventListener("click", getLocation);

    $("backToCreateBtn").addEventListener("click", () => {
    $("profileView").classList.add("hidden");
    $("createdView").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
});
   if ($("scannerHomeBtn")) {
    $("scannerHomeBtn").addEventListener("click", async () => {
        await stopScanner();
        $("scannerView").classList.add("hidden");
        $("createView").classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

if ($("stopScannerBtn")) {
    $("stopScannerBtn").addEventListener("click", stopScanner);
}

    const qrId = new URLSearchParams(location.search).get("qr");

    if (qrId) {
        loadProfile(qrId);
    }
});

async function createProfile(event) {
    event.preventDefault();

    const formData = Object.fromEntries(
        new FormData($("profileForm")).entries()
    );

    $("formMessage").textContent = "Creating profile...";

    try {
        const response = await fetch("/api/profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Profile creation failed.");
        }

        currentProfile = result.profile;

        $("createView").classList.add("hidden");
        $("profileView").classList.add("hidden");
        $("createdView").classList.remove("hidden");
        $("formMessage").textContent = "";

        const profileUrl =
            `${location.origin}/?qr=${encodeURIComponent(currentProfile.id)}`;
        $("profileLink").href = profileUrl;
        $("profileLink").textContent = profileUrl;

        $("qrcode").innerHTML = "";

        if (typeof QRCode === "undefined") {
            throw new Error(
                "QR library did not load. Check your internet connection."
            );
        }

        new QRCode($("qrcode"), {
            text: profileUrl,
            width: 240,
            height: 240,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        $("formMessage").textContent = error.message;
    }
}

async function loadProfile(id) {
    $("createView").classList.add("hidden");
    $("createdView").classList.add("hidden");
    $("profileView").classList.remove("hidden");

    $("displayName").textContent = "Loading profile...";

    try {
        const response = await fetch(
            `/api/profile/${encodeURIComponent(id)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Profile unavailable.");
        }

        showProfile(result.profile);

    } catch (error) {
        $("displayName").textContent = "Profile unavailable";
        $("displayAgeAddress").textContent = error.message;
        $("sosBtn").disabled = true;
    }
}

function showProfile(profile) {
    currentProfile = profile;

    // Show the profile screen
    $("createView").classList.add("hidden");
    $("createdView").classList.add("hidden");
    $("profileView").classList.remove("hidden");

    $("profileInitials").textContent = profile.fullName
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0] || "")
        .join("")
        .toUpperCase();

    $("displayName").textContent = profile.fullName;

    $("displayAgeAddress").textContent =
        `Age ${profile.age}` +
        (profile.address ? ` · ${profile.address}` : "");

    $("displayBlood").textContent =
        `Blood: ${profile.bloodGroup || "Unknown"}`;

    $("displayAllergies").textContent =
        profile.allergies || "Not provided";

    $("displayConditions").textContent =
        profile.conditions || "Not provided";

    $("displayMedications").textContent =
        profile.medications || "Not provided";

    $("displayAddress").textContent =
        profile.address || "Not provided";

    renderContacts(profile.contacts || []);

    $("sosBtn").disabled = false;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function renderContacts(contacts) {
    const container = $("emergencyContactsList");
    container.innerHTML = "";

    contacts.forEach((contact, index) => {
        if (!contact.phone) return;

        const card = document.createElement("div");
        card.className = "emergency-contact-card";

        const heading = document.createElement("strong");
        heading.textContent = `Emergency Contact ${index + 1}`;

        const name = document.createElement("p");
        name.textContent = contact.name || "Contact";

        const phone = document.createElement("p");
        phone.textContent = contact.phone;

        const callButton = document.createElement("a");
        callButton.className = "call-button";
        callButton.textContent = "📞 Call";
        callButton.href =
            `tel:${contact.phone.replace(/[^\d+*#,;]/g, "")}`;

        card.append(heading, name, phone, callButton);
        container.appendChild(card);
    });

    if (!container.children.length) {
        container.textContent = "No emergency contacts provided.";
    }
}


function getLocation() {
    const locationResult = document.getElementById("locationResult");

    if (!navigator.geolocation) {
        locationResult.textContent =
            "Location is not supported by this browser.";
        return;
    }

    if (!window.isSecureContext) {
        locationResult.textContent =
            "Location requires HTTPS. Open the deployed HTTPS website.";
        return;
    }

    locationResult.textContent = "Getting your location...";

    navigator.geolocation.getCurrentPosition(
        function (position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const mapUrl =
        `https://www.google.com/maps?q=${latitude},${longitude}`;

    // Save the rescuer's current location for SOS
    currentLocation = {
        latitude,
        longitude,
        mapsUrl: mapUrl
    };

    locationResult.textContent =
        `Latitude: ${latitude}, Longitude: ${longitude}`;

    const link = document.createElement("a");
    link.href = mapUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open location in Google Maps";

    locationResult.appendChild(document.createElement("br"));
    locationResult.appendChild(link);
},
        function (error) {
            const messages = {
                1: "Location permission denied. Allow location access in browser settings.",
                2: "Your location could not be determined. Check GPS and location services.",
                3: "Location request timed out. Please try again."
            };

            locationResult.textContent =
                messages[error.code] || "Unable to get your location.";
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}


async function sendSOS() {
    if (!currentProfile) {
        $("sosStatus").textContent = "Profile is not loaded.";
        return;
    }

    const confirmed = confirm(
        "Submit an SOS request for this person?"
    );
    if (!confirmed) return;

    $("sosBtn").disabled = true;
    $("sosBtn").textContent = "SENDING SOS...";

    try {
        if (!currentLocation) {
    $("sosStatus").textContent =
        "Location unavailable. Sending SOS without location...";
    }
        const response = await fetch("/api/sos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                profileId: currentProfile.id,
                location: currentLocation,
                message: "Emergency assistance requested"
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "SOS request failed.");
        }

        $("sosStatus").textContent =
            "SOS request recorded by the server. This demo has not sent SMS.";

        const contacts = (currentProfile.contacts || [])
            .map(contact => contact.phone)
            .filter(Boolean);

        if (contacts.length) {
            const locationText = currentLocation
                ? ` Location: ${currentLocation.mapsUrl}`
                : "";

            const message = encodeURIComponent(
                `SOS: ${currentProfile.fullName} may need emergency help.` +
                locationText +
                " Please check on them immediately."
            );

            const shouldOpenSMS = confirm(
                "Open your messaging app with a message for the emergency contacts? You will need to press Send."
            );

            if (shouldOpenSMS) {
                const numbers = contacts
                    .map(phone => phone.replace(/[^\d+]/g, ""))
                    .join(",");

                window.location.href =
                    `sms:${numbers}?body=${message}`;
            }
        }

    } catch (error) {
        $("sosStatus").textContent =
            `SOS failed: ${error.message}`;
    } finally {
        $("sosBtn").disabled = false;
        $("sosBtn").textContent = "🆘 SEND SOS ALERT";
    }
}

// Create the personalized wallpaper image.
async function downloadWallpaper() {
    if (!currentProfile) return;

    const qrCanvas = $("qrcode").querySelector("canvas");
    const qrImage = $("qrcode").querySelector("img");

    let qrData = "";

    if (qrCanvas) {
        qrData = qrCanvas.toDataURL("image/png");
    } else if (qrImage) {
        qrData = qrImage.src;
    }

    if (!qrData) {
        alert("Please wait for the QR code to appear.");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;

    const ctx = canvas.getContext("2d");

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, "#fffdfb");
    gradient.addColorStop(1, "#f5fffc");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Pastel corners
    ctx.fillStyle = "#d5f1e8";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(310, 0);
    ctx.lineTo(0, 250);
    ctx.fill();

    ctx.fillStyle = "#ffe8d9";
    ctx.beginPath();
    ctx.moveTo(1080, 0);
    ctx.lineTo(800, 0);
    ctx.lineTo(1080, 220);
    ctx.fill();

    ctx.textAlign = "center";

    // Header
    ctx.fillStyle = "#ef233c";
    ctx.font = "bold 100px Arial";
    ctx.fillText("♥", 540, 145);

    ctx.fillStyle = "#102b63";
    ctx.font = "bold 51px Arial";
    ctx.fillText("QR EMERGENCY PROFILE", 540, 250);

    ctx.font = "28px Arial";
    ctx.fillText(
        "Scan for Medical Info • Contacts • Emergency Help",
        540, 310
    );

    ctx.font = "italic 36px Georgia";
    ctx.fillText("Your Health. Our Priority.", 540, 375);

    // QR card
    roundedRect(ctx, 300, 425, 480, 480, 30, "#ffffff", "#ef233c");

    const image = new Image();

    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = qrData;
    });

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 335, 460, 410, 410);
    ctx.imageSmoothingEnabled = true;

    ctx.fillStyle = "#102b63";
    ctx.font = "29px Arial";
    ctx.fillText("Scan to view my emergency", 540, 955);
    ctx.fillText("medical profile", 540, 995);

    // Primary emergency contact
    roundedRect(ctx, 150, 1040, 780, 190, 30, "#fff0f0");

    ctx.fillStyle = "#ef233c";
    ctx.beginPath();
    ctx.arc(255, 1135, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 55px Arial";
    ctx.fillText("☎", 255, 1155);

    ctx.textAlign = "left";
    ctx.fillStyle = "#102b63";
    ctx.font = "bold 26px Arial";
    ctx.fillText("EMERGENCY CONTACT", 350, 1090);

    ctx.font = "bold 37px Arial";
    ctx.fillText(
    fitText(
        ctx,
        currentProfile.contacts?.[0]?.phone || "No contact added",
        540,
        "bold 37px Arial"
    ),
    350,
    1145
);
    ctx.fillStyle = "#4b5563";
    ctx.font = "25px Arial";
    ctx.fillText(
        (currentProfile.contacts?.[0]?.name || "Primary Contact").slice(0, 30),
        350, 1190
    );

    // SOS graphic — this is a static image, not a clickable button.
    roundedRect(ctx, 150, 1285, 780, 210, 105, "#ef233c", "#c8142b");

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 100px Arial";
    ctx.fillText("SOS", 540, 1390);

    ctx.font = "bold 27px Arial";
    ctx.fillText("SCAN QR FOR CLICKABLE SOS", 540, 1450);

    ctx.fillStyle = "#102b63";
    ctx.font = "bold 27px Arial";
    ctx.fillText("HELP CAN REACH YOU FASTER", 540, 1570);

    ctx.font = "22px Arial";
    ctx.fillText(
        "For immediate help, use your phone's Emergency SOS.",
        540, 1620
    );

    canvas.toBlob((blob) => {
        if (!blob) {
            alert("Could not generate wallpaper.");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "emergency-wallpaper.png";
        link.click();

        URL.revokeObjectURL(url);
    }, "image/png");
}

function roundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();

    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }

    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 5;
        ctx.stroke();
    }
}

function fitText(ctx, text, maxWidth, font) {
    ctx.font = font;
    let value = String(text);

    while (
        value.length > 8 &&
        ctx.measureText(value).width > maxWidth
    ) {
        value = value.slice(0, -2);
    }

    return value;
}
let qrScanner = null;

async function openScanner() {
    $("createView").classList.add("hidden");
    $("createdView").classList.add("hidden");
    $("profileView").classList.add("hidden");
    $("scannerView").classList.remove("hidden");

    $("scannerMessage").textContent = "Starting camera...";

    if (typeof Html5Qrcode === "undefined") {
        $("scannerMessage").textContent =
            "Scanner library failed to load. Check your internet connection.";
        return;
    }

    try {
        if (!qrScanner) {
            qrScanner = new Html5Qrcode("qrReader");
        }

        await qrScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
                await stopScanner();

                try {
                    const scannedUrl = new URL(decodedText);

                    if (scannedUrl.searchParams.has("qr")) {
                        window.location.href = scannedUrl.href;
                    } else {
                        $("scannerMessage").textContent =
                            "This QR code is not an emergency profile QR code.";
                    }
                } catch {
                    $("scannerMessage").textContent =
                        "The QR code does not contain a valid profile URL.";
                }
            },
            () => {}
        );

        $("scannerMessage").textContent =
            "Camera ready. Point it at the QR code.";
    } catch (error) {
        $("scannerMessage").textContent =
            "Unable to start the camera. Allow camera permission and try again.";
    }
}

async function stopScanner() {
    if (qrScanner && qrScanner.isScanning) {
        try {
            await qrScanner.stop();
        } catch (error) {
            console.error("Could not stop scanner:", error);
        }
    }
}

