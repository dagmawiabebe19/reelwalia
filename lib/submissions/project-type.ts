export function isSeriesProject(projectType: string): boolean {
  return [
    "Episodic Series",
    "AI Episodic Series",
    "AI Vertical Series",
    "Vertical Drama Series",
  ].includes(projectType);
}

export function isFilmProject(projectType: string): boolean {
  return [
    "Feature Film",
    "Short Film",
    "AI Feature Film",
    "AI Short Film",
  ].includes(projectType);
}

export const LOGLINE_MAX_LENGTH = 250;
