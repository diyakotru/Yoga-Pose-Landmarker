from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json

app = Flask(__name__)
CORS(app)  # allow requests from all origins

# Initialize SQLite db
DB_FILE = "landmarks.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS landmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Upload landmarks
@app.route("/upload_landmarks", methods=["POST"])
def upload_landmarks():
    data = request.json
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO landmarks (data) VALUES (?)", (json.dumps(data),))
    conn.commit()
    conn.close()
    return jsonify({"status": "saved"})

# Get all landmarks
@app.route("/get_landmarks", methods=["GET"])
def get_landmarks():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT data FROM landmarks ORDER BY id ASC")
    rows = c.fetchall()
    all_data = []
    for row in rows:
        all_data.extend(json.loads(row[0]))
    conn.close()
    return jsonify(all_data)

if __name__ == "__main__":
    app.run(debug=True)
