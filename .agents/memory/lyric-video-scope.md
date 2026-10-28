---
name: Lyric video scope
description: User-selected video scope and the synchronization limits of the current music provider.
---

The user selected full-song videos for gifting, rather than short social clips.

**Why:** The user explicitly chose “Full-song video for gifting” when asked which lyric-video feature to add.

**How to apply:** Keep the complete song audio in the gifting export. Do not substitute a short sample.

The music provider's documented Suno track result supplies audio, artwork, and duration, but no lyric timestamps. Estimated line timing must be disclosed and adjustable; it is not verified karaoke synchronization.

**Why:** Spreading approved lyrics across the track cannot account for introductions, instrumental breaks, repeated vocals, or the singer's pacing.

**How to apply:** Do not describe estimates as automatically synchronized. Accurate automatic synchronization requires a separately verified alignment source.

Lyric videos are rendered in the browser, then can be saved to the app's private Supabase Storage bucket. Gift-page playback is authorized with the matching share token and short-lived signed URLs; direct public object URLs are not used.

**Why:** The user asked that videos remain available on the gift page after the creator leaves, while keeping the existing song media and database setup intact.

**How to apply:** Keep local download available as a fallback. The video bucket is provisioned on first save, accepts MP4/WebM up to 50 MB, and should remain private. Do not describe locally rendered output as saved until the upload succeeds.

The lyric-video maker should be available from the completed public gift page as well as the owner's studio.

**Why:** The user expected to create a lyric video while viewing the gift page and could not find the studio-only control.

**How to apply:** Show a clear maker entry point only when the shared song is completed and has lyrics. Public media access must be authorized by that song's matching share token.

Do not assume that a MediaRecorder MP4 container contains H.264 video and AAC audio.

**Why:** Browser verification produced a valid MP4 using VP9/Opus when only the generic `video/mp4` MIME type was selected. That file played in the test browser but may not play in a recipient's phone gallery.

**How to apply:** Probe encoder support for H.264/AAC explicitly. Use a clearly labeled WebM fallback instead of treating generic MP4 container support as broad device compatibility.

Export using explicit media timestamps rather than real-time canvas recording.

**Why:** The real-time WebM fallback stretched a 12-second source to about 14.6 seconds under browser load. Real-time recording clocks cannot guarantee that gift audio, lyrics, and output duration remain aligned.

**How to apply:** Render frames and encode audio against the source track's media timeline. A busy browser may slow the export, but must not stretch the resulting song or silently shift its lyrics.
