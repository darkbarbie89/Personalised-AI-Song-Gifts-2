export type LyricCue = { text: string; start: number };
export type VideoTheme = "cream" | "midnight";
export type VideoDraft = { theme: VideoTheme; dedication: string; cues: LyricCue[] };

/** Section headings are directions, not sung lyrics. Split long lines without dropping words. */
export function lyricLines(lyrics: string): string[] {
  return lyrics.split(/\r?\n/).flatMap((line) => {
    const text = line.trim();
    if (!text || /^\[[^\]]+\]$/.test(text) || /^\((?:instrumental|intro|outro|interlude|solo)\)$/i.test(text)) return [];
    const words = text.split(/\s+/).flatMap(word => word.match(/.{1,72}/gu) ?? []);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if (current && `${current} ${word}`.length > 78) {
        lines.push(current);
        current = word;
      } else current = current ? `${current} ${word}` : word;
    }
    if (current) lines.push(current);
    return lines;
  });
}

export function estimateCues(lyrics: string, duration: number): LyricCue[] {
  const lines = lyricLines(lyrics);
  const intro = Math.min(8, duration * 0.06);
  const available = duration * 0.97 - intro;
  const weights = lines.map(line => Math.max(2, line.split(/\s+/).length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let elapsed = 0;
  return lines.map((text, index) => {
    const start = Math.round((intro + (elapsed / total) * available) * 100) / 100;
    elapsed += weights[index];
    return { text, start };
  });
}

export function validateCues(cues: LyricCue[], duration: number): string | null {
  if (!Number.isFinite(duration) || duration <= 0) return "Wait for the song to finish loading.";
  if (!cues.length) return "This song has no lyrics to display.";
  for (let index = 0; index < cues.length; index++) {
    const time = cues[index].start;
    if (!Number.isFinite(time) || time < 0 || time >= duration) {
      return `Line ${index + 1} must start between 0 and ${(duration - 0.01).toFixed(2)} seconds.`;
    }
    if (index > 0 && time <= cues[index - 1].start) {
      return `Line ${index + 1} must start after line ${index}.`;
    }
  }
  return null;
}

export function activeCueIndex(cues: LyricCue[], time: number): number {
  let active = -1;
  for (let index = 0; index < cues.length; index++) {
    if (cues[index].start > time) break;
    active = index;
  }
  return active;
}

export function formatVideoTime(time: number): string {
  const seconds = Math.max(0, Math.floor(Number.isFinite(time) ? time : 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
