import { activeCueIndex, formatVideoTime, type VideoDraft } from "./timeline";

export type VideoInfo = { recipientName: string; occasion: string };
export type DrawFrameInput = {
  canvas: HTMLCanvasElement;
  info: VideoInfo;
  draft: VideoDraft;
  cover: HTMLImageElement | null;
  time: number;
  duration: number;
};

function wrappedLines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  // Also handles scripts without spaces and unusually long individual words.
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/(\s+)/)) {
    if (ctx.measureText(line + word).width <= width) { line += word; continue; }
    if (line.trim()) lines.push(line.trim());
    line = "";
    for (const character of word) {
      if (line && ctx.measureText(line + character).width > width) {
        lines.push(line.trim());
        line = "";
      }
      line += character;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number, maxSize: number, font: string) {
  let size = maxSize;
  let lines: string[] = [];
  do {
    ctx.font = `600 ${size}px ${font}`;
    lines = wrappedLines(ctx, text, width);
    if (lines.length <= maxLines || size <= 18) break;
    size -= 2;
  } while (true);
  return { lines, size };
}

export function drawVideoFrame({ canvas, info, draft, cover, time, duration }: DrawFrameInput) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot draw a video preview.");
  const dark = draft.theme === "midnight";
  const ink = dark ? "#fff3e4" : "#1a0f12";
  const muted = dark ? "#c3ada1" : "#6e5a55";
  const accent = dark ? "#dcff4f" : "#b83c24";
  const font = typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily : "sans-serif";
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = dark ? "#1a0f12" : "#fff3e4";
  ctx.fillRect(0, 0, 1280, 720);
  const glow = ctx.createRadialGradient(1080, 80, 0, 1080, 80, 720);
  glow.addColorStop(0, dark ? "#422728" : "#ffded1");
  glow.addColorStop(1, dark ? "#1a0f12" : "#fff3e4");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = `600 18px ${font}`;
  ctx.fillText("SONG GIFT  /  MADE FROM YOUR STORY", 72, 66);
  const title = fitText(ctx, `A song for ${info.recipientName}`, 1136, 2, 39, font);
  ctx.fillStyle = ink;
  title.lines.forEach((line, index) => ctx.fillText(line, 72, 116 + index * 40));

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(72, 200, 330, 330, 24);
  ctx.clip();
  if (cover) {
    const ratio = Math.max(330 / cover.naturalWidth, 330 / cover.naturalHeight);
    const w = cover.naturalWidth * ratio;
    const h = cover.naturalHeight * ratio;
    ctx.drawImage(cover, 72 + (330 - w) / 2, 200 + (330 - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#dcff4f";
    ctx.fillRect(72, 200, 330, 330);
    ctx.fillStyle = "#1a0f12";
    ctx.font = `600 120px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText("♪", 237, 405);
  }
  ctx.restore();

  const active = activeCueIndex(draft.cues, time);
  const text = active < 0
    ? (draft.dedication.trim() || "Some stories deserve a song.")
    : draft.cues[active].text;
  const fitted = fitText(ctx, text, 680, 4, 46, font);
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  const top = 360 - ((fitted.lines.length - 1) * fitted.size * 1.3) / 2;
  fitted.lines.forEach((line, index) => ctx.fillText(line, 466, top + index * fitted.size * 1.3));
  ctx.fillStyle = accent;
  ctx.fillRect(466, 225, 48, 4);
  const next = active >= 0 ? draft.cues[active + 1]?.text : "";
  if (next) {
    const upcoming = fitText(ctx, next, 680, 2, 24, font);
    ctx.fillStyle = muted;
    upcoming.lines.forEach((line, index) => ctx.fillText(line, 466, 485 + index * 30));
  }
  ctx.textAlign = "left";
  ctx.fillStyle = muted;
  ctx.font = `400 20px ${font}`;
  const caption = fitText(ctx, draft.dedication.trim() || info.occasion, 1136, 2, 20, font);
  caption.lines.forEach((line, index) => ctx.fillText(line, 72, 582 + index * 25));
  ctx.fillStyle = dark ? "#493336" : "#e7d2c0";
  ctx.fillRect(72, 654, 1136, 3);
  ctx.fillStyle = accent;
  ctx.fillRect(72, 654, 1136 * Math.min(1, Math.max(0, time / (duration || 1))), 3);
  ctx.font = `400 16px ${font}`;
  ctx.fillStyle = muted;
  ctx.fillText(formatVideoTime(time), 72, 688);
  ctx.textAlign = "right";
  ctx.fillText(formatVideoTime(duration), 1208, 688);
}
