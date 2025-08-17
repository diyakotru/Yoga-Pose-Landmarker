import sqlite3
import json

# Connect to the SQLite database
conn = sqlite3.connect("pose.db")
cur = conn.cursor()

# Check tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("Tables:", cur.fetchall())

# Fetch first 5 entries
cur.execute("SELECT * FROM PoseData LIMIT 5;")
rows = cur.fetchall()

for r in rows:
    print("\nID:", r[0])
    print("Timestamp:", r[1])
    print("Landmarks:", json.loads(r[2])[:2])  # just show first 2 landmarks
