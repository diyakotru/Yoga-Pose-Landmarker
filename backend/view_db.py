import sqlite3
from tabulate import tabulate  # optional, just for pretty printing

# connect to your database
conn = sqlite3.connect("instance/database.db")
cursor = conn.cursor()

# list all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables found:", [t[0] for t in tables])

# fetch data from each table
for table in tables:
    table_name = table[0]
    print(f"\n===== Data from {table_name} =====")
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = [col[1] for col in cursor.fetchall()]  # get column names

    rows = cursor.execute(f"SELECT * FROM {table_name}").fetchall()
    if rows:
        print(tabulate(rows, headers=columns, tablefmt="grid"))
    else:
        print("(no data)")

conn.close()
