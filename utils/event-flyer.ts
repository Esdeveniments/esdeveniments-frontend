import { buildOptimizedImageUrl } from "@utils/image-cache";
import type { ShareKitEvent } from "types/event";

// 4:5, the ratio Instagram and Eventbrite flyers use.
const WIDTH = 1080;
const HEIGHT = 1350;
const IMAGE_HEIGHT = 760;
const PADDING = 72;
const FOOTER_HEIGHT = 120;
const DATE_LINE = 64;
const TITLE_LINE = 72;
const PLACE_LINE = 56;

/** Reads a Tailwind token's color so the flyer follows the design system. */
function readTokenColor(className: string, property: "color" | "backgroundColor"): string {
  const probe = document.createElement("span");
  probe.className = className;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  mode: "cover" | "contain",
) {
  const pick = mode === "cover" ? Math.max : Math.min;
  const scale = pick(WIDTH / img.naturalWidth, IMAGE_HEIGHT / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (WIDTH - w) / 2, (IMAGE_HEIGHT - h) / 2, w, h);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && lines.join(" ").length < text.trim().length) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

/**
 * Draws a shareable 1080×1350 PNG: poster on top, date, title and place below,
 * site name in the footer. Posters are usually portrait, so the poster is shown
 * whole over a blurred copy of itself instead of being cropped.
 */
export async function renderEventFlyer(
  event: ShareKitEvent,
  siteLabel: string,
): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");

  const font = getComputedStyle(document.body).fontFamily;
  const primary = readTokenColor("text-primary", "color");
  const strong = readTokenColor("text-foreground-strong", "color");
  const muted = readTokenColor("text-muted-foreground", "color");
  const background = readTokenColor("bg-background", "backgroundColor");
  const border = readTokenColor("bg-border", "backgroundColor");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Same-origin proxy: a cross-origin poster would taint the canvas.
  const poster = event.imageUrl
    ? await loadImage(buildOptimizedImageUrl(event.imageUrl, undefined, { width: WIDTH }))
    : null;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, WIDTH, IMAGE_HEIGHT);
  ctx.clip();
  if (poster) {
    ctx.filter = "blur(32px) brightness(0.7)";
    drawImage(ctx, poster, "cover");
    ctx.filter = "none";
    drawImage(ctx, poster, "contain");
  } else {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, WIDTH, IMAGE_HEIGHT);
    ctx.fillStyle = background;
    ctx.font = `700 72px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(siteLabel, WIDTH / 2, IMAGE_HEIGHT / 2);
  }
  ctx.restore();

  const maxWidth = WIDTH - PADDING * 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `700 60px ${font}`;
  const titleLines = wrapLines(ctx, event.title, maxWidth, event.placeText ? 2 : 3);
  const blockHeight =
    (event.dateText ? DATE_LINE : 0) +
    titleLines.length * TITLE_LINE +
    (event.placeText ? PLACE_LINE : 0);
  // Centre the text between the poster and the footer, so short titles don't
  // leave a gap at the bottom.
  const textArea = HEIGHT - FOOTER_HEIGHT - IMAGE_HEIGHT;
  let y = IMAGE_HEIGHT + Math.max(PADDING / 2, (textArea - blockHeight) / 2);

  if (event.dateText) {
    ctx.fillStyle = primary;
    ctx.font = `700 40px ${font}`;
    ctx.fillText(wrapLines(ctx, event.dateText, maxWidth, 1)[0], PADDING, y);
    y += DATE_LINE;
  }

  ctx.fillStyle = strong;
  ctx.font = `700 60px ${font}`;
  for (const line of titleLines) {
    ctx.fillText(line, PADDING, y);
    y += TITLE_LINE;
  }

  if (event.placeText) {
    ctx.fillStyle = muted;
    ctx.font = `400 40px ${font}`;
    ctx.fillText(wrapLines(ctx, `📍 ${event.placeText}`, maxWidth, 1)[0], PADDING, y + 8);
  }

  const footerY = HEIGHT - FOOTER_HEIGHT;
  ctx.fillStyle = border;
  ctx.fillRect(PADDING, footerY, maxWidth, 2);
  ctx.fillStyle = primary;
  ctx.font = `700 40px ${font}`;
  ctx.textBaseline = "middle";
  ctx.fillText(siteLabel, PADDING, footerY + FOOTER_HEIGHT / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Flyer export failed"))),
      "image/png",
    );
  });
}
