from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from datetime import datetime
import json
import os

# Optional: allow using a different DB path from env
DB_PATH = os.environ.get('DB_PATH', 'sqlite:///database.db')

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = DB_PATH
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)

class Landmark(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(200))
    pose_data = db.Column(db.Text)  # JSON string
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('landmarks', lazy=True))

with app.app_context():
    db.create_all()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json() or {}
    username = data.get('username')
    if not username or not username.strip():
        return jsonify({'error': 'Username is required'}), 400

    username = username.strip()
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    new_user = User(username=username)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully', 'user_id': new_user.id}), 201

@app.route('/api/landmarks', methods=['POST'])
def save_landmarks():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    name = data.get('name')
    landmarks = data.get('landmarks')

    if not user_id or not name or landmarks is None:
        return jsonify({'error': 'Missing user_id, name, or landmark data'}), 400

    # Basic validation: ensure user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    entry = Landmark(user_id=user_id, name=name, pose_data=json.dumps(landmarks))
    db.session.add(entry)
    db.session.commit()

    payload = {
        'id': entry.id,
        'user_id': user_id,
        'name': name,
        'landmarks': landmarks,
        'timestamp': entry.timestamp.isoformat()
    }

    # Emit live update to clients. Clients can filter by user_id if they wish.
    socketio.emit('landmark_update', payload, broadcast=True)

    return jsonify({'message': 'Landmark data saved successfully', 'entry_id': entry.id}), 201

@app.route('/api/landmarks/<int:user_id>', methods=['GET'])
def get_user_landmarks(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    entries = Landmark.query.filter_by(user_id=user_id).order_by(Landmark.timestamp.desc()).all()
    return jsonify([
        {
            'id': e.id,
            'name': e.name,
            'pose_data': json.loads(e.pose_data),
            'timestamp': e.timestamp.isoformat()
        }
        for e in entries
    ])

@socketio.on('connect')
def handle_connect():
    emit('message', {'info': 'Connected to WebSocket server'})

@socketio.on('subscribe_user')
def handle_subscribe(data):
    # client can subscribe to a specific user's updates (optional feature)
    user_id = data.get('user_id')
    if user_id:
        # join room with user id - not using rooms here for simplicity, but you could
        emit('message', {'info': f'Subscribed to user {user_id} updates'})
    else:
        emit('message', {'error': 'user_id required to subscribe'})

if __name__ == '__main__':
    # Use socketio.run which will pick the async_mode backend (eventlet recommended)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
