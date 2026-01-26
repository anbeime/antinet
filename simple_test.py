import sys
sys.path.insert(0, 'backend')
from models.model_loader import ModelConfig
print("Import success!")
print("Available models:", list(ModelConfig.MODELS.keys()))
