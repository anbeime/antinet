import sys
print("Start")
sys.stdout.flush()
import qai_appbuilder
print("qai_appbuilder imported")
print("Attributes:", [a for a in dir(qai_appbuilder) if not a.startswith('_')])
print("Location:", qai_appbuilder.__file__)