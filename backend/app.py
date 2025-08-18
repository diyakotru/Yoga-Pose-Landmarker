from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from datetime import datetime
import time, json, os

DB_URL = os.environ.get("DB_URL", "sqlite:///database.db")
EMIT_INTERVAL_MS = int(os.environ.get("EMIT_INTERVAL_MS", "500"))

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = DB_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# ---------- MODELS ----------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)

class Landmark(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # now optional
    name = db.Column(db.String(200), nullable=True)
    pose_data = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', backref=db.backref('landmarks', lazy=True))

with app.app_context():
    db.create_all()

_last_emit_ms_by_user = {}

# ---------- ROUTES ----------
@app.get("/health")
def health():
    return jsonify({"status": "ok"}), 200

@app.get("/admin")
def admin():
    return render_template("admin.html")

@app.post("/api/register")
def register_user():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"error": "username is required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "username already exists"}), 400
    u = User(username=username)
    db.session.add(u)
    db.session.commit()
    return jsonify({"message": "registered", "user_id": u.id}), 201

@app.post("/api/landmarks")
def save_landmarks():
    """ Save landmarks from HTTP requests """
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    name = data.get("name")
    landmarks = data.get("landmarks")

    if not landmarks:
        return jsonify({"error": "landmarks missing"}), 400

    entry = Landmark(
        user_id=user_id,
        name=name or "live_capture",
        pose_data=json.dumps(landmarks)
    )
    db.session.add(entry)
    db.session.commit()

    socketio.emit("landmark_update", {
        "id": entry.id,
        "user_id": user_id,
        "name": entry.name,
        "landmarks": landmarks,
        "timestamp": entry.timestamp.isoformat()
    }, broadcast=True)

    return jsonify({"message": "saved", "entry_id": entry.id}), 201

@app.get("/api/landmarks/<int:user_id>")
def get_user_landmarks(user_id: int):
    q = Landmark.query.filter_by(user_id=user_id).order_by(Landmark.timestamp.desc())
    items = q.limit(50).all()
    data = [{
        "id": e.id,
        "name": e.name,
        "pose_data": json.loads(e.pose_data),
        "timestamp": e.timestamp.isoformat()
    } for e in items]
    return jsonify({"data": data}), 200

# ---------- SOCKET EVENTS ----------
@socketio.on("landmark_update")
def handle_landmark(data):
    """ Save landmarks coming directly from socket.io frontend """
    landmarks = data.get("landmarks")
    user_id = data.get("user_id")  # optional
    name = data.get("name") or "live_capture"

    if not landmarks:
        return

    entry = Landmark(
        user_id=user_id,
        name=name,
        pose_data=json.dumps(landmarks)
    )
    db.session.add(entry)
    db.session.commit()

    socketio.emit("landmark_update", {
        "id": entry.id,
        "user_id": user_id,
        "name": name,
        "landmarks": landmarks,
        "timestamp": entry.timestamp.isoformat()
    }, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
