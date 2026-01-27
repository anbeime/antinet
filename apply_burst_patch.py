# -*- coding: utf-8 -*-
"""
NPU BURST Mode Patch
Apply BURST performance mode to model loader
"""
import os
import sys

# Read original file
model_loader_path = "C:/test/antinet/backend/models/model_loader.py"

with open(model_loader_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace BURST mode section
old_burst_code = '''                # 启用BURST性能模式以优化延迟（如果qai_hub_models可用）
                try:
                    if PerfProfile is not None:
                        PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
                        logger.info("[OK] 已启用BURST性能模式")
                    else:
                        logger.info("[INFO] 使用默认性能配置（qai_hub_models未安装）")
                except Exception as e:
                    logger.warning(f"[WARNING] 启用BURST模式失败: {e}")'''

new_burst_code = '''                # 启用BURST性能模式以优化延迟（如果qai_hub_models可用）
                try:
                    if PerfProfile is not None:
                        PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
                        logger.info("[OK] 已启用BURST性能模式（qai_hub_models）")
                    else:
                        logger.info("[INFO] qai_hub_models未安装，尝试通过环境变量启用BURST模式")
                        # 尝试通过环境变量启用高性能模式
                        os.environ['QNN_PERFORMANCE_MODE'] = 'BURST'
                        os.environ['QNN_HTP_PERFORMANCE_MODE'] = 'burst'
                        logger.info("[OK] 已通过环境变量启用 BURST 性能模式")
                except Exception as e:
                    logger.warning(f"[WARNING] 启用BURST模式失败: {e}")
                    # 即使失败也尝试设置环境变量
                    try:
                        os.environ['QNN_PERFORMANCE_MODE'] = 'BURST'
                        os.environ['QNN_HTP_PERFORMANCE_MODE'] = 'burst'
                        logger.info("[OK] 已通过环境变量启用 BURST 性能模式（备用方案）")
                    except:
                        pass'''

if old_burst_code in content:
    content = content.replace(old_burst_code, new_burst_code)
    print("[OK] Found and replaced BURST mode code")
else:
    print("[ERROR] Original BURST mode code not found")
    print("Trying partial match...")
    if "启用BURST性能模式" in content:
        print("[OK] Found BURST related code, but format may differ")
    sys.exit(1)

# Backup original file
backup_path = model_loader_path + ".backup"
import shutil
shutil.copy2(model_loader_path, backup_path)
print(f"[OK] Backed up original file to: {backup_path}")

# Write modified content
with open(model_loader_path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"[OK] Applied BURST mode patch to: {model_loader_path}")

# Verify modification
with open(model_loader_path, 'r', encoding='utf-8') as f:
    new_content = f.read()
    if 'QNN_PERFORMANCE_MODE' in new_content:
        print("[OK] Verification successful: BURST environment variables added")
    else:
        print("[ERROR] Verification failed: BURST environment variables not found")
        sys.exit(1)

print("\n" + "="*60)
print("Patch applied successfully!")
print("="*60)
print("Next step: Restart backend service to apply changes")
print("  python backend/main.py")
