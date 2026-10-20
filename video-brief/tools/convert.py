#!/usr/bin/env python3
"""Trim raw Playwright takes to their usable frames and encode 1080p30 H.264 mp4s.

  FFMPEG=/path/to/ffmpeg python3 video-brief/tools/convert.py

Takes longer than MAX_LEN are sped up (≤ MAX_SPEED) so each clip lands at 5–20s.
Mobile takes (393x660) are scaled 1.5x and centered on a cream 1920x1080 canvas with a
rounded ink frame, plus a vertical copy (*-vertical.mp4) for anyone who wants a 9:16 cut.
Writes clips/durations.json for INDEX.md / the rough cut.
"""
import json, os, subprocess

FF = os.environ.get('FFMPEG', 'ffmpeg')
ROOT = os.path.join(os.path.dirname(__file__), '..', 'clips')
RAW = os.path.join(ROOT, 'raw')
MAX_LEN, MAX_SPEED = 20.0, 1.8
CREAM, INK = '0xF5F0E8', '0x2C2416'

trims = json.load(open(os.path.join(RAW, 'trim.json')))
out = {}
for name, t in sorted(trims.items()):
    src = os.path.join(RAW, name + '.webm')
    if not os.path.exists(src):
        continue
    start, length = t['start'], t['end'] - t['start']
    speed = min(MAX_SPEED, max(1.0, length / MAX_LEN))
    pts = f'setpts=PTS/{speed:.3f},' if speed > 1 else ''
    mobile = name.split('-', 1)[1].startswith('mobile')
    if mobile:
        # 393x660 → 590x990 phone, 14px ink bezel, centered on cream.
        vf = (f'{pts}fps=30,scale=590:990:flags=lanczos,'
              f'pad=618:1018:14:14:color={INK},'
              f'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color={CREAM},setsar=1,format=yuv420p')
        vert = os.path.join(ROOT, name + '-vertical.mp4')
        subprocess.run([FF, '-v', 'error', '-y', '-ss', str(start), '-t', str(length), '-i', src,
                        '-vf', f'{pts}fps=30,scale=1080:1814:flags=lanczos,pad=1080:1920:0:53:color={CREAM},setsar=1,format=yuv420p',
                        '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-an', vert], check=True)
    else:
        vf = f'{pts}fps=30,format=yuv420p'
    dst = os.path.join(ROOT, name + '.mp4')
    subprocess.run([FF, '-v', 'error', '-y', '-ss', str(start), '-t', str(length), '-i', src,
                    '-vf', vf, '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
                    '-movflags', '+faststart', '-an', dst], check=True)
    out[name] = {'seconds': round(length / speed, 1), 'speed': round(speed, 2)}
    print(f'{name}.mp4  {length / speed:5.1f}s' + (f'  (sped {speed:.2f}x)' if speed > 1 else ''))

json.dump(out, open(os.path.join(ROOT, 'durations.json'), 'w'), indent=2)
