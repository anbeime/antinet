import sys
import os
import traceback

# Set DLL paths before importing qai_appbuilder
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"
paths_to_add = [lib_path, bridge_lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

print("Testing NPU initialization...")
print(f"Python: {sys.executable}")
print(f"PATH: {os.environ.get('PATH', '')[:300]}")

try:
    from qai_appbuilder import GenieContext
    print("GenieContext imported successfully")
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
print(f"Config path: {config_path}")
if not os.path.exists(config_path):
    print("Config file not found!")
    sys.exit(1)

try:
    print("Creating GenieContext...")
    context = GenieContext(config_path)
    print("✅ GenieContext created successfully!")
    
    # Test a simple query
    response = []
    def callback(text):
        response.append(text)
        return True
    
    print("Querying 'Hello'...")
    context.Query("Hello", callback)
    output = ''.join(response)
    print(f"Response: {output[:200]}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    traceback.print_exc()
    sys.exit(1)