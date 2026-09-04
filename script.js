function checkRisk() {

    const location = document.getElementById("location").value;
    const result = document.getElementById("riskResult");

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

document.getElementById("location").addEventListener("change", function () {

    const selectedLocation = this.value;
    const coordinates = locations[selectedLocation];

    map.setView(coordinates, 7);

    marker.setLatLng(coordinates);

    marker
        .setPopupContent("📍 " + selectedLocation + " - Landslide Monitoring")
        .openPopup();
});
async function getWeather() {
    const selectedLocation = document.getElementById("location").value;
    const [latitude, longitude] = locations[selectedLocation];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&hourly=precipitation&past_days=1&forecast_days=1&timezone=auto`;

    const response = await fetch(url);
    const data = await response.json();

    console.log("Temperature:", data.current.temperature_2m);
    console.log("Humidity:", data.current.relative_humidity_2m);
    const humidity = data.current.relative_humidity_2m;
    const rainfall = data.hourly.precipitation.reduce((sum, value) => sum + value, 0);
    let riskScore = Math.min(
    100,
    Math.round((rainfall * 1.5) + (humidity * 0.4))
);
    window.weatherRiskScore = riskScore;
   
    let weatherRiskLevel;

if (riskScore >= 70) {
    weatherRiskLevel = "HIGH";
} else if (riskScore >= 40) {
    weatherRiskLevel = "MEDIUM";
} else {
    weatherRiskLevel = "LOW";
}

const riskElement = document.getElementById("riskLevel");

if (riskElement) {
    riskElement.textContent = weatherRiskLevel;
}
if (riskElement) {
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
    document.getElementById("temperature").textContent =
    data.current.temperature_2m + "°C";

    document.getElementById("humidity").textContent =
    data.current.relative_humidity_2m + "%";

    document.getElementById("rainfall").textContent =
    rainfall.toFixed(1) + " mm";
}

getWeather();
document.getElementById("location").addEventListener("change", function () {
    getWeather();
});
function triggerWarningSMS() {

    const user = localStorage.getItem("user");

    if (!user) {
        console.log("No registered user found.");
        return;
    }

    const userData = JSON.parse(user);

    console.log("⚠️ HIGH RISK WARNING");
    console.log("SMS will be sent to:", userData.mobile);

}
