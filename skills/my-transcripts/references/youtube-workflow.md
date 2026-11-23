# YouTube acquisition and screenshot selection

The helper retrieves source material and extracts frames. The agent selects useful visuals and writes the notes; the script does not understand diagrams. Resolve `--deep` and `--screenshots` options in SKILL.md first. With screenshots disabled, use only caption acquisition (or audio transcription as needed), skip the video and frame stages below, and deliver text-only notes with an empty screenshot list. With screenshots enabled, follow the visual stages at either note depth.

## Dependencies

Use Python 3.10+, `yt-dlp`, and `ffmpeg`. Prefer installed executables. If yt-dlp is missing, create a reusable isolated environment outside the skill folder:

```bash
python3 -m venv "$HOME/.cache/my-transcripts/venv"
"$HOME/.cache/my-transcripts/venv/bin/python" -m pip install yt-dlp
```

Use that environment's Python to invoke the helper; it can also discover an installed `yt-dlp` executable. FFmpeg must be on PATH. On macOS it can be installed with `brew install ffmpeg` when dependency installation is authorized. Otherwise state the missing dependency and continue only with the portions that are possible. In environments without a shell or video/image tools, explain that the automatic acquisition or visual stage is unavailable rather than pretending to perform it.

`SCRIPT` below is the absolute path to `scripts/video_source.py` inside this skill. `PYTHON` is the selected Python executable. `WORK` is a persistent output directory chosen from the user's destination, or `~/Documents/YouTube Study Notes/<video-id>/<depth>-<screenshots-or-no-screenshots>`. Use separate directories per video and capture batch so evidence does not mix across videos or get overwritten.

## Fetch captions first

```bash
"$PYTHON" "$SCRIPT" fetch 'https://www.youtube.com/watch?v=VIDEO_ID' --out "$WORK/source" --lang en
```

The output includes raw `.vtt` captions, `source.info.json` (video identity, creator, chapters, duration), `transcript.json` (all timed cues), and `transcript.txt` (readable text with rolling caption repetition reduced). Prefer creator-provided captions when available and identify automatic captions as such. Read all transcript text, in chunks when necessary. Use original cues to resolve ambiguities introduced by rolling-caption cleanup. No API key is required.

If the caption language is unavailable, inspect `subtitles` and `automatic_captions` in the metadata, or run `yt-dlp --ignore-config --no-playlist --list-subs URL`, and select an available exact track such as `en-orig`. Respect the user's requested language. Identify translation as translation. A local VTT file can be normalized with:

```bash
"$PYTHON" "$SCRIPT" captions '/path/to/captions.vtt' --out "$WORK/source"
```

Missing captions: use an available audio transcription tool and record that the transcript is generated, or request a transcript. A title and description cannot substitute for a transcript. If YouTube blocks retrieval, explain the actual error and offer an uploaded video/transcript. Use existing authenticated access only when authorized; do not silently read browser cookies or attempt access-control workarounds. Retry transient retrieval failures once after the helper's bounded retries, then report the limitation.

## Get the video

```bash
"$PYTHON" "$SCRIPT" video 'https://www.youtube.com/watch?v=VIDEO_ID' --out "$WORK/source"
```

This downloads one video, preferring a video-only track up to 720p, sufficient for initial screening. It skips playlists and uses the same deterministic filename so subsequent runs can reuse the download. Use `--height 1080` with a separate output directory when diagram labels need more resolution. Do not repeatedly download the whole video for individual screenshots. The full downloaded video is a working source, not part of the final notes package.

## Inspect and select screenshots per topic

Build topic intervals from the actual transcript. Sample several candidate times inside each interval, spread across its duration. Include times suggested by phrases such as “this diagram,” “on the screen,” or “here is the result.” Capture several stages for an evolving diagram or demonstration when they add information.

```bash
"$PYTHON" "$SCRIPT" frames "$WORK/source/video.webm" \
  --times 00:02:15 00:02:45 00:03:10 --out "$WORK/candidates/topic-01"
```

Use the video's actual extension. Times accept seconds or HH:MM:SS, must be within the source duration, and are absolute video positions, not times relative to the topic. The command writes full-resolution `frame-0001.png` etc., `frames.json` mapping filenames to exact source times, and paged `contact-sheet-01.png` images. Contact sheets contain up to 16 frames in row-major order; use the manifest to identify timestamps. Open contact sheets with the environment's image viewer, then inspect shortlisted individual PNGs at full resolution. Contact sheets alone cannot establish small text readability. Refine with a new capture batch if the slide is incomplete, the cursor covers a label, or important code is off screen.

Copy only selected frames into `images/`, with descriptive names. Preserve the original frame when a crop is helpful; crops must retain the relevant labels and relationships. Explain why a screenshot matters in the section, without repeating the entire surrounding explanation.

Save `sources.json` alongside `notes.md` with the resolved `deep` and `screenshots` options as `"yes"` or `"no"`, video URL/id/title/creator, caption language and type (manual, automatic, translated, or generated), any known limitations, and a screenshot list containing each selected relative filename, section number, exact capture time in seconds, and a YouTube link with `t=<seconds>`. This preserves precise evidence without adding timestamps outside topic headers in the notes. Keep the notes package small: include notes, sources, and selected images; exclude downloaded video and unselected candidates.

For transcript-only input without a video, preserve the note format and disclose that screenshots could not be sourced. For a video without useful diagrams or demonstrations in a section, write the section without a screenshot; assess every section rather than forcing decorative images.
