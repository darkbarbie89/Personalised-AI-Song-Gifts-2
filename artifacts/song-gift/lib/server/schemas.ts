import { z } from "zod";

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
});

export const checkoutSchema = z.object({
  recipientName: z.string().trim().min(1).max(80),
  relationship: z.string().trim().min(1).max(40),
  occasion: z.string().trim().min(1).max(60),
  story: z.string().trim().min(50).max(5000),
  mood: z.string().trim().min(1).max(40),
  genre: z.string().trim().min(1).max(40),
  package: z.enum(["single", "triple", "collection"]),
  useCredit: z.boolean(),
});

export const completeCheckoutSchema = z.object({
  sessionId: z.string().min(5).max(255),
});

export const generateLyricsSchema = z.object({
  songId: z.string().uuid(),
  recipientName: z.string().trim().min(1).max(80),
  relationship: z.string().trim().min(1).max(40),
  occasion: z.string().trim().min(1).max(60),
  story: z.string().trim().min(50).max(5000),
  mood: z.string().trim().min(1).max(40),
  genre: z.string().trim().min(1).max(40),
  tryAgain: z.boolean(),
});

export const songLyricsSchema = z.object({
  lyrics: z.string().trim().min(20).max(5000),
});

export const generateSongSchema = z.object({
  songId: z.string().uuid(),
  lyrics: z.string().trim().min(20).max(5000),
  genre: z.string().trim().min(1).max(40),
  mood: z.string().trim().min(1).max(40),
});