import sys
print("Testing imports...")

# Test 1: Python path
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples/genie/python')
sys.path.insert(0, 'c:/test/antinet/backend')

print("✓ Paths set")

# Test 2: GenieContext
try:
    from qai_appbuilder import GenieContext
    print("✓ GenieContext imported")
except Exception as e:
    print(f"✗ GenieContext: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Model loader
try:
    from models.model_loader import NPUModelLoader
    print("✓ NPUModelLoader imported")
except Exception as e:
    print(f"✗ NPUModelLoader: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Create loader
try:
    loader = NPUModelLoader()
    print(f"✓ Loader created: {loader.model_config['name']}")
except Exception as e:
    print(f"✗ Create loader: {e}")
    import traceback
    traceback.print_exc()

print("\n✅ Import test completed")
