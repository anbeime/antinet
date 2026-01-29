import sqlite3

conn = sqlite3.connect('data/antinet.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(gtd_tasks)')
print("GTD Tasks 表结构:")
for row in cursor.fetchall():
    print(row)
conn.close()
