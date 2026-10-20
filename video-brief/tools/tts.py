#!/usr/bin/env python3
"""Draft voiceover with macOS `say`: one file per script beat + one continuous track.

  FFMPEG=/path/to/ffmpeg VOICE=Samantha RATE=180 python3 video-brief/tools/tts.py

Reads tools/beats.json (exported from script.md). Writes voiceover/NN-<slug>.aiff + .m4a,
voiceover/full-voiceover.m4a, and voiceover/durations.json. Prints each beat's duration next
to its script slot and the paired clip(s), flagging any beat that runs long.
"""
import json, os, re, subprocess

FF = os.environ.get('FFMPEG', 'ffmpeg')
VOICE = os.environ.get('VOICE', 'Samantha')
RATE = os.environ.get('RATE', '180')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'voiceover')
CLIPS = os.path.join(HERE, '..', 'clips')
os.makedirs(OUT, exist_ok=True)

SLUGS = ['intro', 'what-is-it', 'problem', 'who-for', 'apply', 'vetting', 'browse', 'booking',
         'emergency', 'nannies', 'reviews', 'roadmap', 'okrs', 'team', 'values', 'outro']
# Spoken forms the voice would otherwise read oddly.
SAY_AS = {'little lamb nannies dot com': 'little lamb nannies dot com', 'Westmont': 'West-mont'}

beats = json.load(open(os.path.join(HERE, 'beats.json')))
clip_len = json.load(open(os.path.join(CLIPS, 'durations.json')))

def secs(t):
    m, s = t.split(':'); return int(m) * 60 + int(s)

def dur(path):
    r = subprocess.run([FF, '-i', path], capture_output=True, text=True).stderr
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)

report, parts = {}, []
for b, slug in zip(beats, SLUGS):
    text = b['text']
    for k, v in SAY_AS.items():
        text = text.replace(k, v)
    # A short breath between sentences; keeps 180 wpm from feeling rushed.
    text = re.sub(r'([.?!])\s+', r'\1 [[slnc 400]] ', text)
    base = os.path.join(OUT, f"{b['id']}-{slug}")
    subprocess.run(['say', '-v', VOICE, '-r', RATE, '-o', base + '.aiff', text], check=True)
    subprocess.run([FF, '-v', 'error', '-y', '-i', base + '.aiff', '-c:a', 'aac', '-b:a', '192k',
                    base + '.m4a'], check=True)
    d = dur(base + '.m4a')
    a, z = b['time'].split('–')
    slot = secs(z) - secs(a)
    clips = re.findall(r'`(\d\d-[\w-]+)\.mp4`', b['visual'])
    footage = sum(clip_len[c]['seconds'] for c in clips if c in clip_len)
    report[f"{b['id']}-{slug}"] = {'seconds': round(d, 2), 'slot': slot, 'clips': clips,
                                   'footage': round(footage, 1)}
    parts.append(base + '.m4a')
    flag = ''
    if d > slot:
        flag = '  ⚠ longer than its script slot'
    elif clips and d > footage:
        flag = f'  ⚠ longer than its clip footage ({footage:.1f}s) — hold last frame or add b-roll'
    print(f"{b['id']}-{slug:<11} {d:5.1f}s  slot {slot:>2}s  clips {', '.join(clips) or 'AI/card only'}{flag}")

# Continuous track: beats back to back with a 0.6 s breath between.
lst = os.path.join(OUT, 'concat.txt')
gap = os.path.join(OUT, '_gap.m4a')
subprocess.run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-t', '0.6',
                '-c:a', 'aac', '-b:a', '192k', gap], check=True)
with open(lst, 'w') as f:
    for p in parts:
        f.write(f"file '{os.path.abspath(p)}'\nfile '{os.path.abspath(gap)}'\n")
full = os.path.join(OUT, 'full-voiceover.m4a')
subprocess.run([FF, '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c:a', 'aac',
                '-b:a', '192k', full], check=True)
os.remove(lst); os.remove(gap)
report['full-voiceover'] = {'seconds': round(dur(full), 2)}
json.dump(report, open(os.path.join(OUT, 'durations.json'), 'w'), indent=2)
print(f"full-voiceover.m4a  {dur(full):.1f}s  (voice {VOICE}, {RATE} wpm)")
