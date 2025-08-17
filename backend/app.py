from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
import json
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pose.db'  
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")

class PoseData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    landmarks = db.Column(db.Text)  # Store JSON string of landmarks

with app.app_context():
    db.create_all()

@socketio.on("landmark_update")
def handle_landmarks(data):
    try:
        landmarks_json = json.dumps(data["landmarks"])
        entry = PoseData(landmarks=landmarks_json)
        db.session.add(entry)
        db.session.commit()
        print("Pose data saved at", datetime.utcnow())
    except Exception as e:
        print("Error saving pose data:", e)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
