# YogaPoseBackendFinal

This is the backend for the Yoga Pose Landmarker app.
It provides:
- User registration
- Persistent storage of pose landmarks (SQLite)
- Live updates via WebSockets (Flask-SocketIO)

## Quickstart (local)

1. Create a virtual environment (recommended)
   ```bash
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   ```
2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server
   ```bash
   python app.py
   ```
4. Endpoints
   - `POST /api/register` => { "username": "alice" }
   - `POST /api/landmarks` => { "user_id": 1, "name": "video1", "landmarks": [...] }
   - `GET /api/landmarks/<user_id>` => get user's landmarks
   - WebSocket endpoint: connect to the same URL (ws) and listen to `landmark_update` events

## Notes
- This server uses `eventlet` for async WebSocket support. If deploying to production, ensure the platform supports long-lived connections.
- For production, replace SQLite with Postgres or another managed DB and secure the endpoints (authentication).
