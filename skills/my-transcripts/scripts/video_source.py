#!/usr/bin/env python3
"""Acquire video evidence; semantic frame selection and notes belong to the agent."""
import argparse
import html
import importlib.util
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlparse


def run(args):
    subprocess.run([str(a) for a in args], check=True)


def downloader():
    if shutil.which('yt-dlp'):
        return ['yt-dlp']
    if importlib.util.find_spec('yt_dlp'):
        return [sys.executable, '-m', 'yt_dlp']
    raise ValueError('Missing yt-dlp. See references/youtube-workflow.md for setup.')


def youtube_url(value):
    parsed = urlparse(value)
    if parsed.scheme != 'https' or parsed.hostname not in {
        'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
        'www.youtube-nocookie.com',
    }:
        raise argparse.ArgumentTypeError('Supply an HTTPS YouTube video URL.')
    return value


def seconds(value):
    parts = value.replace(',', '.').split(':')
    if not 1 <= len(parts) <= 3:
        raise ValueError('Time must be seconds or HH:MM:SS.')
    result = 0.0
    for part in parts:
        result = result * 60 + float(part)
    if not math.isfinite(result) or result < 0:
        raise ValueError('Time must be finite and nonnegative.')
    return result


def stamp(value):
    whole = int(value)
    return f'{whole // 3600:02}:{whole // 60 % 60:02}:{whole % 60:02}'


def parse_vtt(path):
    cues = []
    for block in re.split(r'\n\s*\n', path.read_text(encoding='utf-8-sig').replace('\r\n', '\n')):
        lines = block.splitlines()
        if not lines or lines[0].startswith(('NOTE', 'STYLE', 'REGION')):
            continue
        index = next((i for i, line in enumerate(lines) if '-->' in line), None)
        if index is None:
            continue
        left, right = lines[index].split('-->', 1)
        start, end = seconds(left.strip()), seconds(right.strip().split()[0])
        raw = ' '.join(lines[index + 1:])
        text = html.unescape(re.sub(r'<[^>]*>', '', raw))
        text = ' '.join(text.split())
        if text and end > start:
            cues.append({'start': start, 'end': end, 'text': text})
    return cues


def normalize(source, out):
    cues = parse_vtt(source)
    if not cues:
        raise ValueError('Caption file contains no timed text.')
    (out / 'transcript.json').write_text(json.dumps(cues, ensure_ascii=False, indent=2), encoding='utf-8')
    # Rolling captions repeat text: retain all original cues in JSON, but remove
    # the overlapping prefix in the readable transcript.
    readable, previous, previous_end = [], [], -1.0
    for cue in cues:
        words = cue['text'].split()
        overlap = 0
        possible_overlap = min(len(previous), len(words)) if cue['start'] < previous_end else 0
        for count in range(possible_overlap, 0, -1):
            if previous[-count:] == words[:count]:
                overlap = count
                break
        fresh = words[overlap:]
        if fresh:
            readable.append(f"[{stamp(cue['start'])}] {' '.join(fresh)}")
        previous = words
        previous_end = cue['end']
    (out / 'transcript.txt').write_text('\n'.join(readable) + '\n', encoding='utf-8')
    print(f'Transcript: {out / "transcript.txt"}; {len(cues)} source cues')


def fetch(args):
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    run(downloader() + ['--ignore-config', '--no-playlist', '--skip-download',
        '--write-info-json', '--write-subs', '--write-auto-subs',
        '--sub-langs', args.lang, '--sub-format', 'vtt', '--retries', '2',
        '--socket-timeout', '20', '-o', str(out / 'source.%(ext)s'), '--', args.url])
    files = sorted(out.glob('source.*.vtt'))
    if not files:
        raise ValueError('No captions available in the requested language. Use an available transcription tool or request captions; do not invent a transcript.')
    if len(files) != 1:
        raise ValueError('Multiple caption tracks found. Normalize one explicitly using the captions command.')
    normalize(files[0], out)


def video(args):
    args.out.mkdir(parents=True, exist_ok=True)
    run(downloader() + ['--ignore-config', '--no-playlist', '--retries', '2',
        '--socket-timeout', '20', '-f',
        f'bv[height<={args.height}]/b[height<={args.height}]/worst',
        '-o', str(args.out.resolve() / 'video.%(ext)s'), '--', args.url])


def frames(args):
    if not shutil.which('ffmpeg'):
        raise ValueError('Missing ffmpeg. See references/youtube-workflow.md.')
    source = args.video.resolve()
    if not source.is_file():
        raise ValueError('Video file does not exist.')
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    times = sorted(set(seconds(t) for t in args.times))
    manifest = []
    for index, time in enumerate(times, 1):
        target = out / f'frame-{index:04}.png'
        run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
            '-ss', str(time), '-i', source, '-frames:v', '1', target])
        if not target.exists() or target.stat().st_size == 0:
            raise ValueError(f'No frame at {time}s; check video duration.')
        manifest.append({'index': index, 'seconds': time, 'timestamp': stamp(time), 'file': str(target)})
    (out / 'frames.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    for page, start in enumerate(range(1, len(times) + 1, 16), 1):
        count = min(16, len(times) - start + 1)
        rows = math.ceil(count / 4)
        run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
            '-start_number', str(start), '-i', out / 'frame-%04d.png',
            '-vf', f'scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,tile=4x{rows}:nb_frames={count}',
            '-frames:v', '1', out / f'contact-sheet-{page:02}.png'])
    print(f'Frames and contact sheets: {out}; mapping: {out / "frames.json"}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for name, handler in [('fetch', fetch), ('video', video)]:
        command = commands.add_parser(name)
        command.add_argument('url', type=youtube_url)
        command.add_argument('--out', type=Path, required=True)
        if name == 'fetch':
            command.add_argument('--lang', default='en', help='Exact caption track, e.g. en, en-orig, es')
        else:
            command.add_argument('--height', type=int, default=720)
        command.set_defaults(handler=handler)
    command = commands.add_parser('captions')
    command.add_argument('file', type=Path)
    command.add_argument('--out', type=Path, required=True)
    def captions(args):
        args.out.mkdir(parents=True, exist_ok=True)
        normalize(args.file, args.out)
    command.set_defaults(handler=captions)
    command = commands.add_parser('frames')
    command.add_argument('video', type=Path)
    command.add_argument('--times', nargs='+', required=True)
    command.add_argument('--out', type=Path, required=True)
    command.set_defaults(handler=frames)
    args = parser.parse_args()
    try:
        args.handler(args)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Error: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
