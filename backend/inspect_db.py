import sqlite3

for db_name, db_path in [("antinet.db", "./data/antinet.db"), ("memory.db", "./data/memory.db")]:
    print(f"\n=== {db_name} ===")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    for t in tables:
        tname = t[0]
        cursor.execute(f"PRAGMA table_info({tname})")
        cols = cursor.fetchall()
        cursor.execute(f"SELECT COUNT(*) FROM {tname}")
        count = cursor.fetchone()[0]
        print(f"  [{tname}] ({count} rows)")
        for c in cols:
            print(f"      {c[1]} ({c[2]})")
    conn.close()
