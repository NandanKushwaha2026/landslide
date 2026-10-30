
let userLatitude = null;
let userLongitude = null;
const nerBounds = L.latLngBounds(
    [21.5, 87.5],
    [29.5, 97.8]
);

const map = L.map('map', {
    maxBounds: nerBounds.pad(0.08),
    maxBoundsViscosity: 1,
    minZoom: 6
});

map.fitBounds(nerBounds);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

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
    const result = document.getElementById("riskResult");

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

const map = L.map('map').setView([26.2006, 92.9376], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


map.fitBounds(nerBounds);
const map = L.map('map', {
    maxBounds: nerBounds.pad(0.08),
    maxBoundsViscosity: 1,
    minZoom: 6
});

map.fitBounds(nerBounds);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
// NORTH EAST INDIA - 8 STATES MAP

const nerStates = [
    "Arunachal Pradesh",
    "Assam",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Sikkim",
    "Tripura"
];

// Load real state boundaries from GeoJSON
const geoJsonURL =
    "https://raw.githubusercontent.com/iamaanahmad/GeoJson-of-Indian-States/master/indian-states.geojson";

let nerBoundaryLayer;

fetch(geoJsonURL)
    .then(response => {
        if (!response.ok) {
            throw new Error("GeoJSON loading failed");
        }
        return response.json();
    })
    .then(data => {

        const filteredStates = {
            type: "FeatureCollection",
            features: data.features.filter(feature =>
                nerStates.includes(feature.properties.name)
            )
        };

        if (filteredStates.features.length !== 8) {
            throw new Error("All 8 states were not found");
        }

        nerBoundaryLayer = L.geoJSON(filteredStates, {

            style: {
                color: "#14532d",
                weight: 2,
                fillColor: "#86efac",
                fillOpacity: 0.35
            },

            onEachFeature: function(feature, layer) {

                const stateName = feature.properties.name;

                layer.bindPopup(
                    "<strong>" + stateName + "</strong>"
                );

                layer.on("click", function() {
                    map.fitBounds(layer.getBounds());
                });
            }

        }).addTo(map);

        const bounds = nerBoundaryLayer.getBounds();

        map.fitBounds(bounds, {
            padding: [20, 20]
        });

        map.setMaxBounds(bounds.pad(0.15));
        map.options.maxBoundsViscosity = 1;

        console.log("North East 8 states loaded successfully");

    })
    .catch(error => {
        console.error("Map Error:", error);
    });

// User location marker
let marker = L.marker([27.5330, 88.5122])
    .addTo(map)
    .bindPopup("Landslide Monitoring Location");

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
             getWeather();

map.setView([userLatitude, userLongitude], 13);

marker.setLatLng([userLatitude, userLongitude])
    .setPopupContent("📍 Your Live Location - Landslide Monitoring")
    .openPopup();
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
async function searchLocation() {
    const searchText =
        document.getElementById("searchLocation").value.trim();

    if (searchText === "") {
        alert("Please enter a location.");
        return;
    }

    try {
        const url =
            "https://nominatim.openstreetmap.org/search" +
            "?q=" +
            encodeURIComponent(searchText + ", India") +
            "&format=json" +
            "&addressdetails=1" +
            "&limit=5" +
            "&countrycodes=in";

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Location search failed");
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            alert(
                "Location not found in India. Please try another location."
            );
            return;
        }

        const location = data[0];

        userLatitude = parseFloat(location.lat);
        userLongitude = parseFloat(location.lon);

        map.setView(
            [userLatitude, userLongitude],
            13
        );

        marker.setLatLng([
            userLatitude,
            userLongitude
        ])
        .setPopupContent(
            "📍 " + location.display_name
        )
        .openPopup();

        document.getElementById("locationStatus").textContent =
            "✅ Searched location selected.";

        document.getElementById("coordinates").textContent =
            "Latitude: " +
            userLatitude.toFixed(6) +
            " | Longitude: " +
            userLongitude.toFixed(6);

        getWeather();

    } catch (error) {
        console.error("Search Error:", error);

        alert(
            "Unable to search location. Please try again."
        );
    }
}
