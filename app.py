from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

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
