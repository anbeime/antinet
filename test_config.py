import os
import json

config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
print(f"Checking config file: {config_path}")
print(f"File exists: {os.path.exists(config_path)}")

if os.path.exists(config_path):
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
            print(f"File size: {len(content)} bytes")
            print(f"First 500 chars:\n{content[:500]}")
            
            # Try to parse JSON
            data = json.loads(content)
            print(f"\nJSON parsed successfully")
            print(f"Keys: {list(data.keys())}")
            print(f"Full config:\n{json.dumps(data, indent=2)}")
    except Exception as e:
        print(f"Error reading file: {e}")
        import traceback
        traceback.print_exc()

# Check llama3.2-3b config
llama_config = "C:/model/llama3.2-3b-8380-qnn2.37/config.json"
print(f"\n\nChecking llama config: {llama_config}")
print(f"File exists: {os.path.exists(llama_config)}")
if os.path.exists(llama_config):
    try:
        with open(llama_config, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Keys: {list(data.keys())}")
    except Exception as e:
        print(f"Error: {e}")