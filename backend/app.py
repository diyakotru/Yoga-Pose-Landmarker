from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from datetime import datetime
import time, json, os

DB_URL = os.environ.get("DB_URL", "sqlite:///database.db")
EMIT_INTERVAL_MS = int(os.environ.get("EMIT_INTERVAL_MS", "500"))  # throttle live events

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = DB_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)

class Landmark(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    pose_data = db.Column(db.Text, nullable=False)  # JSON string
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', backref=db.backref('landmarks', lazy=True))

with app.app_context():
    db.create_all()

_last_emit_ms_by_user = {}

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
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    name = data.get("name")
    landmarks = data.get("landmarks")
    if not user_id or not name or landmarks is None:
        return jsonify({"error": "missing user_id, name or landmarks"}), 400

    u = db.session.get(User, user_id)
    if not u:
        return jsonify({"error": "user not found"}), 404

    # FIX: handle JSON properly
    if isinstance(landmarks, str):
        pose_text = landmarks  # already JSON string
    else:
        pose_text = json.dumps(landmarks)

    entry = Landmark(user_id=user_id, name=name, pose_data=pose_text)
    db.session.add(entry)
    db.session.commit()

    now_ms = int(time.time() * 1000)
    last_ms = _last_emit_ms_by_user.get(user_id, 0)
    if now_ms - last_ms >= EMIT_INTERVAL_MS:
        socketio.emit("landmark_update", {
            "id": entry.id,
            "user_id": user_id,
            "name": name,
            "landmarks": landmarks,
            "timestamp": entry.timestamp.isoformat()
        }, broadcast=True)
        _last_emit_ms_by_user[user_id] = now_ms

    return jsonify({"message": "saved", "entry_id": entry.id}), 201

@app.get("/api/landmarks/<int:user_id>")
def get_user_landmarks(user_id: int):
    try:
        page = int(request.args.get("page", 1))
        page_size = min(int(request.args.get("page_size", 25)), 200)
    except ValueError:
        return jsonify({"error": "invalid pagination params"}), 400

    q = Landmark.query.filter_by(user_id=user_id).order_by(Landmark.timestamp.desc())
    items = q.paginate(page=page, per_page=page_size, error_out=False)
    data = [{
        "id": e.id,
        "name": e.name,
        "pose_data": json.loads(e.pose_data),
        "timestamp": e.timestamp.isoformat()
    } for e in items.items]
    return jsonify({
        "page": page,
        "page_size": page_size,
        "total": items.total,
        "data": data
    }), 200

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)