import os
os.chdir('C:/D/zhiyi/backend')
import sys
sys.path.insert(0, 'C:/D/zhiyi/backend')
try:
    from pypdf import PdfReader
    print('pypdf OK')
except ImportError as e:
    print(f'pypdf ERROR: {e}')

try:
    from tools.pdf_processor import SimplePDFProcessor
    processor = SimplePDFProcessor()
    print(f'PDF processor available: {processor.available}')
except Exception as e:
    print(f'Processor ERROR: {e}')