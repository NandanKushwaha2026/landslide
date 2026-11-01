from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import psycopg2
from werkzeug.security import generate_password_hash, check_password_hash
app = Flask(__name__)
CORS(app)  # फ्रंटएंड को बैकएंड से डेटा फ़ेच करने की अनुमति देता है

# नॉर्थ-ईस्ट राज्यों के कोऑर्डिनेट्स
NE_STATES = {
    "Assam": {"lat": 26.2006, "lng": 92.9376},
    "Meghalaya": {"lat": 25.4670, "lng": 91.3662},
    "Arunachal Pradesh": {"lat": 28.2180, "lng": 94.7278},
    "Nagaland": {"lat": 26.1584, "lng": 94.5624},
    "Manipur": {"lat": 24.6637, "lng": 93.9063},
    "Mizoram": {"lat": 23.1645, "lng": 92.9376},
    "Tripura": {"lat": 23.9408, "lng": 91.9882},
    "Sikkim": {"lat": 27.5330, "lng": 88.5122}
}

def calculate_risk(rainfall, soil_moisture=0.5):
    # रियल डेटा के आधार पर बेसिक रिस्क लॉजिक
    if rainfall > 50:
        return "High", 85
    elif rainfall > 20:
        return "Moderate", 55
    else:
        return "Low", 20
@app.route('/api/weather', methods=['GET'])
def weather():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)

    if lat is None or lon is None:
        return jsonify({"error": "lat and lon required"}), 400

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m",
        "hourly": "precipitation",
        "forecast_days": 1,
    }

    try:
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        return jsonify(res.json())
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 502
@app.route('/api/forecast', methods=['GET'])
def forecast():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "lat and lon required"}), 400

    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "precipitation_sum,temperature_2m_max",
        "hourly": "soil_moisture_0_to_7cm",
        "past_days": 3,
        "forecast_days": 7,
        "timezone": "auto",
    }
    try:
        res = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=10)
        res.raise_for_status()
        d = res.json()
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 502

    dates = d["daily"]["time"]
    rain = [r or 0 for r in d["daily"]["precipitation_sum"]]
    temp = d["daily"]["temperature_2m_max"]
    soil_h = d["hourly"]["soil_moisture_0_to_7cm"]

    days = []
    for i in range(3, len(dates)):
        past3 = sum(rain[i-3:i])
        vals = [v for v in soil_h[i*24:(i+1)*24] if v is not None]
        soil = sum(vals) / len(vals) if vals else 0.3
        score = rain[i] + 0.5 * past3 + soil * 30
        risk = "High" if score >= 50 else "Moderate" if score >= 25 else "Low"
        days.append({
            "date": dates[i],
            "rain": round(rain[i], 1),
            "temp": temp[i],
            "risk": risk,
        })
    return jsonify({"success": True, "days": days})
def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if not email or len(password) < 6:
        return jsonify({"success": False, "error": "Email and password (min 6 chars) required"}), 400

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "Email already registered"}), 409
        cur.execute(
            "INSERT INTO users (name, email, phone, password_hash) VALUES (%s, %s, %s, %s)",
            (name, email, phone, generate_password_hash(password)),
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        print("Register error:", e)
        return jsonify({"success": False, "error": "Server error"}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id, name, password_hash FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        conn.close()
    except Exception as e:
        print("Login error:", e)
        return jsonify({"success": False, "error": "Server error"}), 500

    if not row or not check_password_hash(row[2], password):
        return jsonify({"success": False, "error": "Wrong email or password"}), 401

    return jsonify({"success": True, "user": {"id": row[0], "name": row[1], "email": email}})   
@app.route('/api/states-risk', methods=['GET'])
def get_all_states_risk():
    results = []
    
    for state_name, coords in NE_STATES.items():
        try:
            # रियल-टाइम वेदर डेटा (Open-Meteo API - Free, No Key Required)
            url = f"https://api.open-meteo.com/v1/forecast?latitude={coords['lat']}&longitude={coords['lng']}&current=temperature_2m,relative_humidity_2m,precipitation"
            response = requests.get(url, timeout=5)
            data = response.json()
            
            current = data.get("current", {})
            rainfall = current.get("precipitation", 0.0)
            temp = current.get("temperature_2m", 0.0)
            humidity = current.get("relative_humidity_2m", 0)
            
            risk_level, risk_score = calculate_risk(rainfall)
            
            results.append({
                "name": state_name,
                "lat": coords["lat"],
                "lng": coords["lng"],
                "rainfall": rainfall,
                "temperature": temp,
                "humidity": humidity,
                "risk": risk_level,
                "risk_score": risk_score
            })
        except Exception as e:
            results.append({
                "name": state_name,
                "lat": coords["lat"],
                "lng": coords["lng"],
                "error": str(e)
            })

    return jsonify({"success": True, "data": results})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
