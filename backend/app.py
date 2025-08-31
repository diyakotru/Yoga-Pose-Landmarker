from flask import Flask, request, jsonify
from flask_cors import CORS
import os, json, time

app = Flask(__name__)
CORS(app)  # ✅ Enable CORS

DATA_DIR = "backend/data"

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

@app.route("/upload_landmarks", methods=["POST"])
def upload_landmarks():
    data = request.json
    timestamp = int(time.time())
    filepath = os.path.join(DATA_DIR, f"landmarks_{timestamp}.json")
    with open(filepath, "w") as f:
        json.dump(data, f)
    return jsonify({"status": "saved", "file": filepath})

@app.route("/get_landmarks", methods=["GET"])
def get_landmarks():
    files = sorted(os.listdir(DATA_DIR))
    all_data = []
    for f in files:
        with open(os.path.join(DATA_DIR, f)) as file:
            all_data.extend(json.load(file))
    return jsonify(all_data)

if __name__ == "__main__":
    app.run(debug=True)
