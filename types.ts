
export enum ZennMode {
  ANXIETY = 'ANXIETY_REGULATION',
  EXPRESSION = 'EMOTIONAL_EXPRESSION',
  GROUNDING = 'FOCUS_GROUNDING',
  REFLECTION = 'AI_GUIDED_REFLECTION'
}

export interface MotionData {
  speed: number;
  erraticness: number;
  symmetry: number;
  position: { x: number; y: number };
  // Nuanced fields
  openness: number; // 0 to 1 (closed fist to wide open)
  tremor: number;   // 0 to 1 (stills to high-frequency jitter)
  pressure: number; // 0 to 1 (gentle touch to forceful movement)
}

export interface ZennState {
  mode: ZennMode;
  lastUpdate: number;
  isThinking: boolean;
  message: string;
}
