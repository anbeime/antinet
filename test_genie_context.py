import sys
import os
import traceback

# Set DLL paths
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

print("Testing GenieContext creation...")
try:
    from qai_appbuilder import GenieContext
    print("GenieContext imported")
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
print(f"Config path: {config_path}")
if not os.path.exists(config_path):
    print("Config file not found")
    sys.exit(1)

try:
    print("Creating GenieContext...")
    context = GenieContext(config_path)
    print("✅ GenieContext created successfully!")
    
    # Test query
    response = []
    def callback(text):
        response.append(text)
        return True
    
    print("Querying 'Hello'...")
    context.Query("Hello", callback)
    output = ''.join(response)
    print(f"Response: {output[:500]}")
    
    # Additional test
    print("\nQuerying 'What is AI?'...")
    response2 = []
    context.Query("What is AI?", lambda t: response2.append(t) or True)
    output2 = ''.join(response2)
    print(f"Response: {output2[:500]}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    traceback.print_exc()
    sys.exit(1)