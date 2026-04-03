
import { GoogleGenAI, Type } from "@google/genai";
import { ZennMode, MotionData } from "../types";

const SYSTEM_PROMPT = `You are MYZENN Core, an emotionally intelligent, trauma-aware AI designed to support mental well-being through non-verbal, hand-gesture–based interaction.

You receive real-time hand gesture data:
- Speed/Erraticness: Physical pacing.
- Openness: Hand posture (0=clenched/tense, 1=open/relaxed).
- Tremor: Nervous system signal (high tremor suggests acute stress or shivering).
- Pressure: The perceived force or "weight" of the movement.

CORE PHILOSOPHY:
- Body before words: Movement comes before meaning.
- Safety over insight: Calm the nervous system first.

MODES:
1. ANXIETY_REGULATION: Triggered by fast, high-tremor, or erratic motion. Respond with slowing guidance.
2. EMOTIONAL_EXPRESSION: Triggered by high pressure/erraticness. Validate the release.
3. FOCUS_GROUNDING: Triggered by low openness or hesitation. Invite symmetry.
4. AI_GUIDED_REFLECTION: User asks questions. Reflect, don't interpret.

TONE: Short, warm, grounded. Avoid clinical jargon. Silence is okay.`;

export class ZennAIService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeMotionAndRespond(
    mode: ZennMode,
    motion: MotionData,
    history: string[]
  ) {
    const prompt = `
      CURRENT MOTION PROFILE:
      - Mode Context: ${mode}
      - Speed: ${motion.speed.toFixed(2)}
      - Openness: ${motion.openness.toFixed(2)} (${motion.openness < 0.4 ? 'clenched/tense' : 'open/soft'})
      - Tremor: ${motion.tremor.toFixed(2)} (${motion.tremor > 0.6 ? 'high jitter' : 'stable'})
      - Pressure: ${motion.pressure.toFixed(2)} (${motion.pressure > 0.7 ? 'forceful' : 'light'})
      
      Based on this physical state, provide a very brief (1 sentence) grounding response. 
      If openness is low, encourage softening. If tremor is high, encourage stillness.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.6,
        },
      });

      return response.text || "";
    } catch (error) {
      console.error("Zenn AI Error:", error);
      return "";
    }
  }
}

export const zennAI = new ZennAIService();
