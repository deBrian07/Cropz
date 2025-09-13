import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, top_k_accuracy_score, classification_report
from sklearn.ensemble import RandomForestClassifier

DATA = Path("data/Crop_recommendation.csv")
ART = Path("models")
ART.mkdir(parents=True, exist_ok=True)

# 1) Load
print("Loading dataset...")
df = pd.read_csv(DATA)

features = ["N","P","K","temperature","humidity","ph","rainfall"]
X = df[features].values
le = LabelEncoder()
y = le.fit_transform(df["label"])

print(f"Dataset shape: {df.shape}")
print(f"Features: {features}")
print(f"Number of crop types: {len(le.classes_)}")
print(f"Crop types: {le.classes_}")

# 2) Stratified split
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training set: {X_tr.shape[0]} samples")
print(f"Test set: {X_te.shape[0]} samples")

# 3) Train baseline (fast & strong)
print("Training Random Forest model...")
rf = RandomForestClassifier(
    n_estimators=600, 
    min_samples_leaf=2,
    class_weight="balanced_subsample",
    random_state=42, 
    n_jobs=-1
)
rf.fit(X_tr, y_tr)

# 4) Evaluate
print("Evaluating model...")
y_hat = rf.predict(X_te)
probs = rf.predict_proba(X_te)

print("="*50)
print("MODEL PERFORMANCE")
print("="*50)
print(f"Accuracy: {accuracy_score(y_te, y_hat):.4f}")
print(f"Macro-F1: {f1_score(y_te, y_hat, average='macro'):.4f}")
print(f"Top-3 accuracy: {top_k_accuracy_score(y_te, probs, k=3):.4f}")

print("\nClassification Report:")
print(classification_report(y_te, y_hat, target_names=le.classes_))

# Feature importances
print("\nFeature Importances:")
importances = rf.feature_importances_
for feat, imp in zip(features, importances):
    print(f"{feat}: {imp:.4f}")

# 5) Compute per-crop means for explanations
print("\nComputing per-crop statistics...")
means = df.groupby("label")[features].mean().to_dict(orient="index")

# 6) Save artifacts
artifacts = {
    "model": rf, 
    "label_encoder": le, 
    "features": features,
    "means": means
}
joblib.dump(artifacts, ART / "crop_rf.joblib")
print(f"\nSaved model artifacts to: {ART / 'crop_rf.joblib'}")

print("\nTraining completed successfully!")

