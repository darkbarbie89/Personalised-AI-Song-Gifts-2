import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activeCueIndex, estimateCues, formatVideoTime, lyricLines, validateCues } from "./timeline.ts";

describe("lyric video timeline", () => {
  it("keeps sung words and repeated choruses, but omits section headings", () => {
    assert.deepEqual(lyricLines("[Verse 1]\nHere we are\n\n[Chorus]\nStay with me\n(Instrumental)\n[Chorus]\nStay with me"), [
      "Here we are", "Stay with me", "Stay with me",
    ]);
  });
  it("does not lose words when splitting long lines", () => {
    const text = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    assert.equal(lyricLines(text).join(" "), text);
    assert.ok(lyricLines(text).every(line => line.length <= 78));
  });
  it("estimates ordered starts within the full track", () => {
    const cues = estimateCues("One short line\nAnother longer line to sing\nAnd one last line", 185);
    assert.equal(validateCues(cues, 185), null);
    assert.equal(cues.length, 3);
    assert.equal(activeCueIndex(cues, 0), -1);
    assert.equal(activeCueIndex(cues, cues[1].start), 1);
    assert.equal(activeCueIndex(cues, 185), 2);
  });
  it("rejects invalid edits instead of silently reordering them", () => {
    const cue = (start: number) => ({ text: "Sing this", start });
    for (const cues of [[cue(-1)], [cue(NaN)], [cue(10)], [cue(5), cue(5)], [cue(5), cue(4)]]) {
      assert.ok(validateCues(cues, 10));
    }
    assert.ok(validateCues([], 10));
    assert.equal(validateCues([cue(0), cue(9.99)], 10), null);
  });
  it("handles empty lyrics and formats full-song playback time", () => {
    assert.deepEqual(estimateCues("[Instrumental]\n", 120), []);
    assert.equal(formatVideoTime(185.9), "3:05");
    assert.equal(formatVideoTime(NaN), "0:00");
  });
});
