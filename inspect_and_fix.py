# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, r'C:\D\zhiyi\backend')
with open(r'C:\D\zhiyi\backend\routes\meeting_routes.py', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
for i in range(1745, 1760):
    line = lines[i]
    indent = len(line) - len(line.lstrip())
    content = line.rstrip()
    print(f'Line {i+1}: indent={indent:2d}  {repr(content[:70])}')

# Now try to compile
print('\n--- Trying to compile ---')
try:
    with open(r'C:\D\zhiyi\backend\routes\meeting_routes.py', 'r', encoding='utf-8') as f:
        ast.parse(f.read())
    print('OK: AST parse successful')
except SyntaxError as e:
    print(f'ERROR at line {e.lineno}: {e.msg}')
    print(f'  Text: {repr(e.text)}')