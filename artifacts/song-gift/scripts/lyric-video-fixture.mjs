// Isolated browser-test media. Writes only to the OS temp directory.
// No real accounts, songs, database writes, or paid generation calls.
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

const id = randomUUID();
const sampleRate = 22050;
const samples = sampleRate * 12;
const wav = Buffer.alloc(44 + samples * 2);
wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36);
wav.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  const envelope = Math.min(1, t * 8, (12 - t) * 8);
  wav.writeInt16LE(Math.round(Math.sin(t * Math.PI * 440) * envelope * 5000), 44 + i * 2);
}
const audioPath = "/tmp/songgift-lyric-video-test.wav";
const coverPath = "/tmp/songgift-lyric-video-test.svg";
await writeFile(audioPath, wav);
await writeFile(coverPath, '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#dcff4f"/><text x="300" y="320" font-size="58" text-anchor="middle">For You</text></svg>');
const song = {
  id, recipientName: "Video Test Recipient", relationship: "Friend",
  occasion: "Birthday", story: "Isolated lyric video browser verification fixture.",
  mood: "Happy & Upbeat", genre: "Pop",
  lyrics: "[Verse 1]\nEvery memory turns to gold\nA story only we can hold\n[Chorus]\nHere's a song to say I care\nA little gift for you to share",
  lyricsApproved: true, status: "completed",
  songUrl: "https://test.invalid/fixture.wav",
  alternateSongUrl: null, coverArtUrl: "https://test.invalid/cover.svg",
  shareToken: randomUUID(), createdAt: new Date().toISOString(),
};
await writeFile("/tmp/songgift-lyric-video-fixture.json", JSON.stringify({ song, audioPath, coverPath }));
console.log(`Local fixture ready: /studio/${id}. Data: /tmp/songgift-lyric-video-fixture.json`);
