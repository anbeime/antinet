import subprocess
import os
import time
import sys

print("Testing GenieAPIService.exe...")

# Path to GenieAPIService
service_path = "C:/ai-engine-direct-helper/samples/genie/bin/GenieAPIService.exe"
model_config = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"

print(f"Service path: {service_path}")
print(f"Exists: {os.path.exists(service_path)}")
print(f"Model config: {model_config}")
print(f"Exists: {os.path.exists(model_config)}")

# Build command
cmd = [
    service_path,
    "-c", model_config,
    "-p", "8910",
    "-l"  # Enable logging
]

print(f"\nCommand: {' '.join(cmd)}")
print("Starting service (will run for 30 seconds)...")

try:
    # Start service
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8',
        errors='ignore'
    )
    
    print(f"Service PID: {process.pid}")
    
    # Wait and read output
    for i in range(30):
        time.sleep(1)
        # Try to read output
        try:
            output = process.stdout.read(1024)
            if output:
                print(f"[Service output] {output}")
        except:
            pass
        
        print(f"  {i+1}/30 seconds")
        
        # Check if process is still running
        if process.poll() is not None:
            print(f"Service exited with code: {process.returncode}")
            break
    
    # Terminate if still running
    if process.poll() is None:
        print("Terminating service...")
        process.terminate()
        process.wait(timeout=5)
    
    # Read any remaining output
    stdout, stderr = process.communicate()
    if stdout:
        print(f"\nFinal stdout:\n{stdout[:1000]}")
    if stderr:
        print(f"\nFinal stderr:\n{stderr[:1000]}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\nTest complete.")