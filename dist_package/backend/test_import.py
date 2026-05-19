#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

try:
    from routes import enhanced_chat_routes
    if hasattr(enhanced_chat_routes, 'router'):
        print("SUCCESS: router found")
        print("Prefix:", enhanced_chat_routes.router.prefix)
    else:
        print("ERROR: no router attribute")
except Exception as e:
    print("ERROR:", e)
    import traceback
    traceback.print_exc()