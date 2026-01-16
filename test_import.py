import sys
import os
import traceback

print("Python version:", sys.version)
print("Current directory:", os.getcwd())
print("Python path:", sys.path)

# Add qai_appbuilder path
qai_path = "C:/ai-engine-direct-helper/samples"
sys.path.insert(0, qai_path)
print(f"\nAdded path: {qai_path}")
print("Updated Python path:", sys.path)

# Try to import
print("\nTrying to import qai_appbuilder...")
try:
    import qai_appbuilder
    print("SUCCESS: qai_appbuilder imported")
    print("Module file:", qai_appbuilder.__file__)
    print("Module attributes:", [attr for attr in dir(qai_appbuilder) if not attr.startswith('_')])
except Exception as e:
    print("FAILED to import qai_appbuilder:")
    traceback.print_exc()

# Try to import GenieContext directly
print("\nTrying to import GenieContext directly...")
try:
    from qai_appbuilder import GenieContext
    print("SUCCESS: GenieContext imported")
    print("GenieContext class:", GenieContext)
except Exception as e:
    print("FAILED to import GenieContext:")
    traceback.print_exc()