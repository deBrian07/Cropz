"use client";

import { useMemo, useState } from "react";

type FormsBallAnswer = "yes" | "no";
type RibbonLengthAnswer = "none" | "<1" | "1-2" | ">2";
type FeelAnswer = "gritty" | "balanced" | "smooth";

type WizardStep = "formsBall" | "ribbonLength" | "feel" | "result";

interface Answers {
  formsBall?: FormsBallAnswer;
  ribbonLength?: RibbonLengthAnswer;
  feel?: FeelAnswer;
}

interface PredictionResult {
  texture: string;
  explanation: string;
}

function predictSoilTexture(answers: Answers): PredictionResult | null {
  if (!answers.formsBall) return null;

  if (answers.formsBall === "no") {
    return {
      texture: "Sand",
      explanation:
        "Soil does not remain in a ball when squeezed, indicating very low clay and organic matter with dominant sand-sized particles.",
    };
  }

  if (!answers.ribbonLength) return null;

  if (answers.ribbonLength === "none") {
    return {
      texture: "Loamy sand",
      explanation:
        "Forms a ball but no ribbon when pressed; indicates very low clay with some silt and sand providing slight cohesion.",
    };
  }

  if (!answers.feel) return null;

  // Map ribbon length and feel to USDA texture classes (Texture-by-Feel method)
  // Source: USDA NRCS Texture-by-Feel method flowchart.
  // Ribbon < 1 inch (~< 2.5 cm): Sandy loam / Loam / Silt loam
  if (answers.ribbonLength === "<1") {
    if (answers.feel === "gritty") {
      return {
        texture: "Sandy loam",
        explanation:
          "Short ribbon with distinctly gritty feel suggests sand-dominant matrix with modest fines.",
      };
    }
    if (answers.feel === "smooth") {
      return {
        texture: "Silt loam",
        explanation:
          "Short ribbon and very smooth, flour-like feel indicates higher silt content.",
      };
    }
    return {
      texture: "Loam",
      explanation:
        "Short ribbon with balanced gritty and smooth feel indicates relatively even sand, silt, and clay.",
    };
  }

  // Ribbon 1–2 inches (~2.5–5 cm): Sandy clay loam / Clay loam / Silty clay loam
  if (answers.ribbonLength === "1-2") {
    if (answers.feel === "gritty") {
      return {
        texture: "Sandy clay loam",
        explanation:
          "Moderate ribbon and gritty feel indicates clay loam with notable sand fraction.",
      };
    }
    if (answers.feel === "smooth") {
      return {
        texture: "Silty clay loam",
        explanation:
          "Moderate ribbon with very smooth feel indicates clay loam enriched in silt.",
      };
    }
    return {
      texture: "Clay loam",
      explanation:
        "Moderate ribbon and balanced feel suggests a clay loam with mixed particle sizes.",
    };
  }

  // Ribbon > 2 inches (> 5 cm): Sandy clay / Clay / Silty clay
  if (answers.ribbonLength === ">2") {
    if (answers.feel === "gritty") {
      return {
        texture: "Sandy clay",
        explanation:
          "Long ribbon with gritty feel indicates high clay content with significant sand fraction.",
      };
    }
    if (answers.feel === "smooth") {
      return {
        texture: "Silty clay",
        explanation:
          "Long ribbon and very smooth feel indicates high clay with substantial silt fraction.",
      };
    }
    return {
      texture: "Clay",
      explanation:
        "Long ribbon and balanced feel indicates high clay content.",
    };
  }

  return null;
}

export interface SoilTextureWizardResult {
  texture: string;
  explanation: string;
  answers: Answers;
}

interface SoilTextureWizardProps {
  onComplete?: (result: SoilTextureWizardResult) => void;
}

export default function SoilTextureWizard({ onComplete }: SoilTextureWizardProps) {
  const [answers, setAnswers] = useState<Answers>({});

  const currentStep: WizardStep = useMemo(() => {
    if (!answers.formsBall) return "formsBall";
    if (answers.formsBall === "no") return "result";
    if (!answers.ribbonLength) return "ribbonLength";
    if (answers.ribbonLength === "none") return "result";
    if (!answers.feel) return "feel";
    return "result";
  }, [answers]);

  const prediction = useMemo(() => predictSoilTexture(answers), [answers]);

  const stepIndex = useMemo(() => {
    if (currentStep === "formsBall") return 1;
    if (currentStep === "ribbonLength") return 2;
    if (currentStep === "feel") return 3;
    return 4; // result
  }, [currentStep]);

  const reset = () => setAnswers({});

  const goBack = () => {
    if (currentStep === "formsBall") return;
    if (currentStep === "ribbonLength") {
      setAnswers((prev) => ({ ...prev, formsBall: undefined }));
      return;
    }
    if (currentStep === "feel") {
      setAnswers((prev) => ({ ...prev, ribbonLength: undefined }));
      return;
    }
    // currentStep === "result"
    if (answers.formsBall === "no") {
      setAnswers((prev) => ({ ...prev, formsBall: undefined }));
      return;
    }
    if (answers.ribbonLength === "none") {
      setAnswers((prev) => ({ ...prev, ribbonLength: undefined }));
      return;
    }
    setAnswers((prev) => ({ ...prev, feel: undefined }));
  };

  return (
    <div className="rounded-2xl border p-6 sm:p-8 bg-white/60 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">New land · Soil texture by feel</h2>
        <div className="text-sm text-gray-500">{`Step ${stepIndex} of 4`}</div>
      </div>

      <div className="mt-6 h-2 w-full rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-green-600 transition-all"
          style={{ width: `${(stepIndex / 4) * 100}%` }}
        />
      </div>

      {currentStep === "formsBall" && (
        <div className="mt-8">
          <p className="text-gray-700">
            Moisten a small handful of soil. Knead it to break clods. Does it
            remain in a ball when squeezed firmly in your palm?
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, formsBall: "yes" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">Yes — remains in a ball</div>
              <div className="text-sm text-gray-600 mt-1">Cohesive with some fines</div>
            </button>
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, formsBall: "no" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">No — will not hold a ball</div>
              <div className="text-sm text-gray-600 mt-1">Loose, single-grain</div>
            </button>
          </div>
        </div>
      )}

      {currentStep === "ribbonLength" && (
        <div className="mt-8">
          <p className="text-gray-700">
            Roll the moistened soil into a ball. Press it between your thumb and
            forefinger to form a ribbon. What is the longest ribbon you can form
            before it breaks?
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, ribbonLength: "none" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">No ribbon</div>
              <div className="text-sm text-gray-600 mt-1">Breaks immediately</div>
            </button>
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, ribbonLength: "<1" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">Short ribbon</div>
              <div className="text-sm text-gray-600 mt-1">Less than 1 inch (2.5 cm)</div>
            </button>
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, ribbonLength: "1-2" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">Moderate ribbon</div>
              <div className="text-sm text-gray-600 mt-1">1–2 inches (2.5–5 cm)</div>
            </button>
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, ribbonLength: ">2" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">Long ribbon</div>
              <div className="text-sm text-gray-600 mt-1">More than 2 inches (5 cm)</div>
            </button>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={goBack} className="px-4 py-2 rounded-lg border">
              Back
            </button>
            <button onClick={reset} className="px-4 py-2 rounded-lg border">
              Start over
            </button>
          </div>
        </div>
      )}

      {currentStep === "feel" && (
        <div className="mt-8">
          <p className="text-gray-700">
            Rub the moistened soil between your fingers. How does it feel?
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, feel: "gritty" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">Very gritty</div>
              <div className="text-sm text-gray-600 mt-1">Sandiness is dominant</div>
            </button>
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, feel: "balanced" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">Balanced</div>
              <div className="text-sm text-gray-600 mt-1">Gritty and smooth about equal</div>
            </button>
            <button
              onClick={() => setAnswers((prev) => ({ ...prev, feel: "smooth" }))}
              className="rounded-xl border p-4 text-left hover:border-green-600 hover:bg-green-50"
            >
              <div className="font-medium">Very smooth</div>
              <div className="text-sm text-gray-600 mt-1">Flour-like, silky</div>
            </button>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={goBack} className="px-4 py-2 rounded-lg border">
              Back
            </button>
            <button onClick={reset} className="px-4 py-2 rounded-lg border">
              Start over
            </button>
          </div>
        </div>
      )}

      {currentStep === "result" && prediction && (
        <div className="mt-8">
          <div className="rounded-xl border p-5 bg-green-50 border-green-200">
            <div className="text-sm text-green-700">Predicted soil texture</div>
            <div className="mt-1 text-2xl font-semibold text-green-900">
              {prediction.texture}
            </div>
            <div className="mt-2 text-gray-700">{prediction.explanation}</div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={goBack} className="px-4 py-2 rounded-lg border">
              Change previous answer
            </button>
            <button onClick={reset} className="px-4 py-2 rounded-lg border">
              Start a new assessment
            </button>
            {onComplete && (
              <button
                onClick={() => onComplete({ texture: prediction.texture, explanation: prediction.explanation, answers })}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Save soil type
              </button>
            )}
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Based on the USDA NRCS Texture-by-Feel method. See guidance: texture-by-feel
            flowchart (USDA NRCS).
          </p>
        </div>
      )}
    </div>
  );
}


