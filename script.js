let userLatitude = null;
let userLongitude = null;

function getLiveLocation() {
    const status = document.getElementById("locationStatus");
    const coordinates = document.getElementById("coordinates");

    status.textContent = "📍 Detecting location...";

    if (!navigator.geolocation) {
        status.textContent = "❌ Geolocation is not supported.";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLatitude = position.coords.latitude;
            userLongitude = position.coords.longitude;

            status.textContent = "✅ Live location detected.";

            coordinates.textContent =
                "Latitude: " + userLatitude.toFixed(6) +
                " | Longitude: " + userLongitude.toFixed(6);
        },
        function(error) {
            status.textContent =
                "❌ Location permission denied or unavailable.";
            console.log(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}
function checkRisk() {

  const location =
    userLatitude !== null && userLongitude !== null
        ? userLatitude.toFixed(6) + ", " + userLongitude.toFixed(6)
        : "Live location not detected";
    const score = window.weatherRiskScore ?? 0;

    let riskLevel;
    let message;

    if (score >= 70) {
        riskLevel = "HIGH";
        message = "⚠️ High rainfall/humidity conditions detected. Stay alert.";
    }
    else if (score >= 40) {
        riskLevel = "MEDIUM";
        message = "Moderate weather conditions detected. Monitor the area.";
    }
    else {
        riskLevel = "LOW";
        message = "Current weather conditions indicate lower risk.";
    }

    let riskClass;

    if (riskLevel === "HIGH") {
        riskClass = "high-risk";
    }
    else if (riskLevel === "MEDIUM") {
        riskClass = "medium-risk";
    }
    else {
        riskClass = "low-risk";
    }

    result.innerHTML = `
        <h2>⚠️ LANDSLIDE WARNING</h2>
        <h3 class="${riskClass}">${riskLevel} RISK</h3>
        <p>📍 Location: <strong>${location}</strong></p>
        <p>${message}</p>
        <p><strong>Risk Score: ${score}%</strong></p>
        <p>Please stay alert and follow local authorities.</p>
    `;
    if (riskLevel === "HIGH") {
    triggerWarningSMS();
}
}
const locations = {
    "Sikkim": [27.5330, 88.5122],
    "Assam": [26.2006, 92.9376],
    "Arunachal Pradesh": [28.2180, 94.7278],
    "Meghalaya": [25.4670, 91.3662],
    "Nagaland": [26.1584, 94.5624],
    "Manipur": [24.6637, 93.9063],
    "Mizoram": [23.1645, 92.9376],
    "Tripura": [23.9408, 91.9882]
};
const map = L.map('map').setView(locations["Sikkim"], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
// Risk markers for NER locations

const riskData = {
    "Sikkim": "HIGH",
    "Assam": "MEDIUM",
    "Arunachal Pradesh": "HIGH",
    "Meghalaya": "HIGH",
    "Nagaland": "MEDIUM",
    "Manipur": "MEDIUM",
    "Mizoram": "MEDIUM",
    "Tripura": "LOW"
};

Object.keys(riskData).forEach(function(location) {

    let risk = riskData[location];

    let color;

    if (risk === "HIGH") {
        color = "red";
    } 
    else if (risk === "MEDIUM") {
        color = "orange";
    } 
    else {
        color = "green";
    }

    L.circleMarker(locations[location], {
        radius: 10,
        color: color,
        fillColor: color,
        fillOpacity: 0.7
    })
    .addTo(map)
    .bindPopup(
        "📍 " + location + "<br>" +
        "⚠️ Risk Level: <strong>" + risk + "</strong>"
    );
});

let marker = L.marker(locations["Sikkim"])
    .addTo(map)
    .bindPopup("📍 Sikkim - Landslide Monitoring")
    .openPopup();

async function getWeather() {

    if (userLatitude === null || userLongitude === null) {
        console.log("Live location not available yet.");
        return;
    }

    const latitude = userLatitude;
    const longitude = userLongitude;

    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&hourly=precipitation&past_days=1&forecast_days=1&timezone=auto`;

    try {

        const response = await fetch(url);
        const data = await response.json();

        const temperature = data.current.temperature_2m;
        const humidity = data.current.relative_humidity_2m;

        const rainfall = data.hourly.precipitation
            .reduce((sum, value) => sum + value, 0);

        let riskScore = Math.min(
            100,
            Math.round((rainfall * 1.5) + (humidity * 0.4))
        );

        window.weatherRiskScore = riskScore;

        let weatherRiskLevel;

        if (riskScore >= 70) {
            weatherRiskLevel = "HIGH";
        }
        else if (riskScore >= 40) {
            weatherRiskLevel = "MEDIUM";
        }
        else {
            weatherRiskLevel = "LOW";
        }

        document.getElementById("temperature").textContent =
            temperature + "°C";

        document.getElementById("humidity").textContent =
            humidity + "%";

        document.getElementById("rainfall").textContent =
            rainfall.toFixed(1) + " mm";

        const riskElement =
            document.getElementById("riskLevel");

        if (riskElement) {

            riskElement.textContent =
                weatherRiskLevel;

            riskElement.className = "";

            if (weatherRiskLevel === "HIGH") {
                riskElement.classList.add("high-risk");
            }
            else if (weatherRiskLevel === "MEDIUM") {
                riskElement.classList.add("medium-risk");
            }
            else {
                riskElement.classList.add("low-risk");
            }
        }

        console.log("Live Weather Loaded");
        console.log("Temperature:", temperature);
        console.log("Humidity:", humidity);
        console.log("Rainfall:", rainfall);
        console.log("Risk Score:", riskScore);

    }
    catch (error) {

        console.error("Weather Error:", error);

        document.getElementById("temperature").textContent =
            "Unable to load";

        document.getElementById("humidity").textContent =
            "Unable to load";

        document.getElementById("rainfall").textContent =
            "Unable to load";
    }
}



function triggerWarningSMS() {

    const user = localStorage.getItem("user");

    if (!user) {
        console.log("No registered user found.");
        return;
    }

    const userData = JSON.parse(user);

    const mobile = userData.mobile;

    // Last 4 digits only for privacy
    const maskedMobile =
        "******" + mobile.slice(-4);

    const smsMessage =
        "LANDSLIDE WARNING: High landslide risk detected in your registered area. Please move to a safer location and follow local authorities' instructions.";

    console.log("⚠️ DEMO SMS SENT");
    console.log("Mobile:", mobile);
    console.log("Message:", smsMessage);

    // Demo SMS notification
    const smsBox = document.createElement("div");

    smsBox.style.marginTop = "15px";
    smsBox.style.padding = "15px";
    smsBox.style.border = "2px solid red";
    smsBox.style.borderRadius = "10px";
    smsBox.style.background = "#fff0f0";

    smsBox.innerHTML = `
        <h3>📱 SMS Alert — DEMO</h3>

        <p>
            <strong>Status:</strong> ✅ SMS Sent
        </p>

        <p>
            <strong>Registered Mobile:</strong>
            ${maskedMobile}
        </p>

        <p>
            <strong>Message:</strong><br>
            ${smsMessage}
        </p>

        <small>
            ⚠️ Demo Mode — No real SMS service connected yet.
        </small>
    `;

    const result = document.getElementById("riskResult");
          getWeather();
    if (result) {
        result.appendChild(smsBox);
    }

}

function getLiveLocation() {

    const status = document.getElementById("locationStatus");
    const coordinates = document.getElementById("coordinates");

    if (!navigator.geolocation) {
        status.textContent = "❌ Location is not supported by this browser.";
        return;
    }

    status.textContent = "📍 Detecting your live location...";

    navigator.geolocation.getCurrentPosition(
        function(position) {

            userLatitude = position.coords.latitude;
            userLongitude = position.coords.longitude;

            status.textContent = "✅ Live location detected.";

            coordinates.textContent =
                "Latitude: " + userLatitude.toFixed(6) +
                " | Longitude: " + userLongitude.toFixed(6);

            // Save location for current browser
            localStorage.setItem(
                "userLocation",
                JSON.stringify({
                    latitude: userLatitude,
                    longitude: userLongitude
                })
            );

        },

        function(error) {

            if (error.code === 1) {
                status.textContent =
                    "❌ Location permission denied. Please allow location access.";
            }
            else if (error.code === 2) {
                status.textContent =
                    "❌ Location unavailable.";
            }
            else if (error.code === 3) {
                status.textContent =
                    "❌ Location request timed out.";
            }
            else {
                status.textContent =
                    "❌ Unable to detect location.";
            }

        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}


// Location button
const getLocationBtn =
    document.getElementById("getLocationBtn");

if (getLocationBtn) {

    getLocationBtn.addEventListener(
        "click",
        getLiveLocation
    );

}


// Automatically load saved location
const savedLocation =
    localStorage.getItem("userLocation");

if (savedLocation) {

    const locationData =
        JSON.parse(savedLocation);

    userLatitude = locationData.latitude;
    userLongitude = locationData.longitude;

    const status =
        document.getElementById("locationStatus");

    const coordinates =
        document.getElementById("coordinates");

    if (status && coordinates) {

        status.textContent =
            "✅ Saved location loaded.";

        coordinates.textContent =
            "Latitude: " +
            userLatitude.toFixed(6) +
            " | Longitude: " +
            userLongitude.toFixed(6);

    }

}
