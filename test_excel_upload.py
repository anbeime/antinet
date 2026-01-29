import requests

# 测试上传 Excel 文件
excel_file = "C:/test/antinet/backend/data/exports/test_full_report.xlsx"

try:
    with open(excel_file, 'rb') as f:
        files = {'file': ('test.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        response = requests.post('http://localhost:8000/api/analysis/upload-and-analyze', files=files, timeout=30)
        
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
