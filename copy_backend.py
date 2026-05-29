import shutil
import os

src = r'c:\D\zhiyi\backend'
dst = r'c:\D\zhiyi\dist_package\backend'

# Copy entire backend directory
if os.path.exists(dst):
    shutil.rmtree(dst)
shutil.copytree(src, dst)
print(f"Copied {src} to {dst}")
