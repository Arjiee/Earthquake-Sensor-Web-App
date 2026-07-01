// Helpers for translating raw accelerometer magnitude into human-readable
// seismic scales (Modified Mercalli Intensity + a rough Richter estimate).

export interface MMI {
  level: number;   // 1..12
  roman: string;
  label: string;
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const LABELS = [
  "", "Not felt", "Weak", "Weak", "Light", "Moderate", "Strong",
  "Very strong", "Severe", "Violent", "Extreme", "Extreme", "Extreme",
];

// Map peak ground acceleration (g) to an MMI band. Rough field approximation.
export function mmiFromPeakG(peakG: number): MMI {
  const pctG = peakG * 100;
  let level = 1;
  if (pctG >= 124) level = 12;
  else if (pctG >= 92) level = 10;
  else if (pctG >= 65) level = 9;
  else if (pctG >= 34) level = 8;
  else if (pctG >= 18) level = 7;
  else if (pctG >= 9.2) level = 6;
  else if (pctG >= 3.9) level = 5;
  else if (pctG >= 1.4) level = 4;
  else if (pctG >= 0.3) level = 3;
  else if (pctG >= 0.1) level = 2;
  return { level, roman: ROMAN[level], label: LABELS[level] };
}

// Color for a given magnitude readout.
export function magnitudeTone(mag: number): "safe" | "alert" {
  return mag >= 4 ? "alert" : "safe";
}
