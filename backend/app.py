from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import os
import datetime
from typing import List, Dict, Any
import logging

# http://127.0.0.1:8080 
app = Flask(__name__)
CORS(app)  # allow requests from all origins

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize SQLite db
DB_FILE = "landmarks.db"

def init_db():
    """Initialize the SQLite database with proper schema"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Create landmarks table with additional metadata
        c.execute("""
            CREATE TABLE IF NOT EXISTS landmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                frame_count INTEGER,
                duration_ms INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        """)
        
        # Create index for better performance
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_created_at ON landmarks(created_at)
        """)
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

# Initialize database
if not init_db():
    raise Exception("Failed to initialize database")

def validate_landmarks_data(data):
    """Validate the structure of landmarks data"""
    if not isinstance(data, list):
        return False, "Data must be a list of frames"
    
    if len(data) == 0:
        return False, "Data cannot be empty"
    
    if len(data) > 10000:  # Reasonable limit
        return False, "Too many frames (max 10000)"
    
    # Check first frame structure
    if data and isinstance(data[0], list):
        for i, frame in enumerate(data[:5]):  # Check first 5 frames
            if not isinstance(frame, list):
                return False, f"Frame {i} is not a list"
            
            if len(frame) < 25:  # Minimum landmarks for basic pose
                return False, f"Frame {i} has too few landmarks ({len(frame)})"
            
            for j, landmark in enumerate(frame[:5]):  # Check first 5 landmarks
                if not isinstance(landmark, dict):
                    return False, f"Frame {i}, landmark {j} is not a dict"
                
                required_keys = ['x', 'y', 'z']
                for key in required_keys:
                    if key not in landmark:
                        return False, f"Frame {i}, landmark {j} missing '{key}'"
                    
                    if not isinstance(landmark[key], (int, float)):
                        return False, f"Frame {i}, landmark {j} '{key}' must be a number"
    
    return True, "Valid"

def get_db_connection():
    """Get database connection with error handling"""
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return None

# Health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for frontend connection testing"""
    try:
        # Test database connection
        conn = get_db_connection()
        if conn is None:
            return jsonify({
                "status": "unhealthy",
                "message": "Database connection failed",
                "timestamp": datetime.datetime.now().isoformat()
            }), 500
        
        conn.close()
        
        return jsonify({
            "status": "healthy",
            "message": "Backend is running properly",
            "timestamp": datetime.datetime.now().isoformat(),
            "version": "1.0.0"
        }), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "message": str(e),
            "timestamp": datetime.datetime.now().isoformat()
        }), 500

# Upload landmarks
@app.route("/upload_landmarks", methods=["POST"])
def upload_landmarks():
    """Upload pose landmarks data with validation"""
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                "success": False,
                "message": "Request must be JSON"
            }), 400
        
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        # Validate landmarks data structure
        is_valid, error_msg = validate_landmarks_data(data)
        if not is_valid:
            return jsonify({
                "success": False,
                "message": f"Invalid data: {error_msg}"
            }), 400
        
        # Calculate metadata
        frame_count = len(data)
        duration_ms = frame_count * 33.33  # Approximate duration at 30fps
        
        metadata = {
            "frame_rate": 30,
            "upload_timestamp": datetime.datetime.now().isoformat(),
            "landmarks_per_frame": len(data[0]) if data else 0
        }
        
        # Save to database
        conn = get_db_connection()
        if conn is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        c = conn.cursor()
        c.execute("""
            INSERT INTO landmarks (data, frame_count, duration_ms, metadata) 
            VALUES (?, ?, ?, ?)
        """, (
            json.dumps(data),
            frame_count,
            int(duration_ms),
            json.dumps(metadata)
        ))
        
        landmark_id = c.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"Landmarks saved successfully: ID={landmark_id}, frames={frame_count}")
        
        return jsonify({
            "success": True,
            "message": "Landmarks saved successfully",
            "id": landmark_id,
            "frame_count": frame_count,
            "duration_ms": int(duration_ms)
        }), 200
        
    except Exception as e:
        logger.error(f"Upload landmarks failed: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

# Get all landmarks
@app.route("/get_landmarks", methods=["GET"])
def get_landmarks():
    """Get all landmarks data with optional filtering"""
    try:
        # Get query parameters
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', type=int, default=0)
        
        conn = get_db_connection()
        if conn is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed",
                "data": []
            }), 500
        
        c = conn.cursor()
        
        # Build query with optional limit and offset
        query = """
            SELECT id, data, frame_count, duration_ms, created_at, metadata 
            FROM landmarks 
            ORDER BY created_at DESC
        """
        params = []
        
        if limit:
            query += " LIMIT ?"
            params.append(limit)
            
        if offset > 0:
            query += " OFFSET ?"
            params.append(offset)
        
        c.execute(query, params)
        rows = c.fetchall()
        
        # Get total count
        c.execute("SELECT COUNT(*) FROM landmarks")
        total_count = c.fetchone()[0]
        
        conn.close()
        
        # Parse results
        all_data = []
        for row in rows:
            try:
                landmarks_data = json.loads(row['data'])
                all_data.append(landmarks_data)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse landmarks data for ID {row['id']}: {e}")
                continue
        
        logger.info(f"Retrieved {len(all_data)} landmark recordings")
        
        # Return response matching frontend expectations
        if not all_data:
            return jsonify([]), 200
        
        return jsonify(all_data), 200
        
    except Exception as e:
        logger.error(f"Get landmarks failed: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}",
            "data": []
        }), 500

# Get landmarks metadata
@app.route("/get_landmarks_metadata", methods=["GET"])
def get_landmarks_metadata():
    """Get metadata about stored landmarks"""
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        c = conn.cursor()
        
        # Get summary statistics
        c.execute("""
            SELECT 
                COUNT(*) as total_recordings,
                AVG(frame_count) as avg_frame_count,
                AVG(duration_ms) as avg_duration_ms,
                MAX(created_at) as latest_recording,
                MIN(created_at) as first_recording
            FROM landmarks
        """)
        
        stats = dict(c.fetchone())
        conn.close()
        
        return jsonify({
            "success": True,
            "metadata": stats
        }), 200
        
    except Exception as e:
        logger.error(f"Get metadata failed: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# Delete landmarks
@app.route("/delete_landmarks/<int:landmark_id>", methods=["DELETE"])
def delete_landmarks(landmark_id):
    """Delete specific landmark recording"""
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        c = conn.cursor()
        c.execute("DELETE FROM landmarks WHERE id = ?", (landmark_id,))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({
                "success": False,
                "message": "Landmark recording not found"
            }), 404
        
        conn.commit()
        conn.close()
        
        logger.info(f"Deleted landmark recording: ID={landmark_id}")
        
        return jsonify({
            "success": True,
            "message": "Landmark recording deleted successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"Delete landmarks failed: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# Clear all landmarks
@app.route("/clear_all_landmarks", methods=["DELETE"])
def clear_all_landmarks():
    """Clear all landmark recordings"""
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        c = conn.cursor()
        c.execute("DELETE FROM landmarks")
        deleted_count = c.rowcount
        
        conn.commit()
        conn.close()
        
        logger.info(f"Cleared all landmark recordings: {deleted_count} records deleted")
        
        return jsonify({
            "success": True,
            "message": f"All landmark recordings cleared ({deleted_count} records deleted)"
        }), 200
        
    except Exception as e:
        logger.error(f"Clear all landmarks failed: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "message": "Endpoint not found"
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        "success": False,
        "message": "Method not allowed"
    }), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "message": "Internal server error"
    }), 500

if __name__ == "__main__":
    # Check if database file exists and is accessible
    if not os.path.exists(DB_FILE):
        logger.info(f"Database file {DB_FILE} will be created")
    
    logger.info("Starting Pose Landmark Backend Server...")
    logger.info("Available endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  POST /upload_landmarks - Upload landmarks data")
    logger.info("  GET  /get_landmarks - Get all landmarks")
    logger.info("  GET  /get_landmarks_metadata - Get landmarks metadata")
    logger.info("  DELETE /delete_landmarks/<id> - Delete specific recording")
    logger.info("  DELETE /clear_all_landmarks - Clear all recordings")
    
    # Start the Flask application
    app.run(
        host="127.0.0.1",  # Bind to localhost
        port=5000,         # Default Flask port
        debug=True,        # Enable debug mode for development
        threaded=True      # Enable threading for better performance
    )
