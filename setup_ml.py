#!/usr/bin/env python3
"""
Setup script for the ML crop recommendation system.
Run this to install dependencies and train the model.
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd):
    """Run a command and return success status."""
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✓ {cmd}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {cmd}")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("🌱 Setting up Cropz ML System")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("data/Crop_recommendation.csv").exists():
        print("❌ Error: Crop_recommendation.csv not found in data/ directory")
        print("Please make sure you're in the project root directory")
        return False
    
    # Install Python dependencies
    print("\n📦 Installing Python dependencies...")
    if not run_command("pip install pandas scikit-learn joblib numpy"):
        print("❌ Failed to install dependencies. Please install manually:")
        print("pip install pandas scikit-learn joblib numpy")
        return False
    
    # Train the model
    print("\n🤖 Training ML model...")
    if not run_command("python ml/train_crop_model.py"):
        print("❌ Failed to train model. Please check the error above.")
        return False
    
    # Test the inference
    print("\n🧪 Testing ML inference...")
    test_script = """
import sys
sys.path.append('.')
from ml.inference import get_crop_recommendations_with_reasons

# Test with sample data
test_data = {
    "N": 90, "P": 42, "K": 43,
    "temperature": 20.8, "humidity": 82.0, "ph": 6.5, "rainfall": 202.9
}

try:
    results = get_crop_recommendations_with_reasons(test_data, k=3)
    print("✓ ML inference working!")
    print(f"Top recommendation: {results[0]['crop']} ({results[0]['percent']:.1f}%)")
    print(f"Reasons: {results[0]['reasons']}")
except Exception as e:
    print(f"❌ ML inference failed: {e}")
    sys.exit(1)
"""
    
    with open("test_ml.py", "w") as f:
        f.write(test_script)
    
    if not run_command("python test_ml.py"):
        print("❌ ML inference test failed")
        return False
    
    # Clean up test file
    os.remove("test_ml.py")
    
    print("\n🎉 Setup complete! Your ML system is ready.")
    print("\nNext steps:")
    print("1. Start the backend: cd backend && uvicorn app.main:app --reload")
    print("2. Start the frontend: cd frontend && npm run dev")
    print("3. Test the API at: http://localhost:8000/docs")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

