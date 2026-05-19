import sys
import os
os.chdir('C:/D/zhiyi/backend')

try:
    from services.report_automation_service import service, ReportAutomationService
    print('SUCCESS: service imported')
except ImportError as e:
    print(f'IMPORT ERROR: {e}')
    import traceback
    traceback.print_exc()