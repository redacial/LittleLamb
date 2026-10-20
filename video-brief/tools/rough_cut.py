#!/usr/bin/env python3
"""Assemble video-brief/rough-cut.mp4: real clips + placeholder cards in script order, TTS on top.

  FFMPEG=/path/to/ffmpeg python3 video-brief/tools/rough_cut.py

Each beat lasts LEAD + its voiceover + TAIL, stretched if its footage needs more room. Clips are
never cut short (the payoff — a toast, a claimed job — is at the end): they are sped up (≤ 1.5x
here, ≤ 2x counting convert.py's own speed-up) or held on their last frame to fill the beat.
Cards get a fixed share. Plain cuts, 1920x1080, 30 fps, H.264 + AAC.
"""
import json, os, subprocess

FF = os.environ.get('FFMPEG', 'ffmpeg')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
CLIPS, CARDS, VO = (os.path.join(ROOT, d) for d in ('clips', 'rough-cut-cards', 'voiceover'))
WORK = os.path.join(ROOT, 'rough-cut-work')
os.makedirs(WORK, exist_ok=True)
LEAD, TAIL = 0.4, 0.8
MAX_SPEED, MAX_TOTAL_SPEED = 1.5, 2.0

# Beat → visuals. ('card', id, share) takes `share` of the beat; ('clip', name) splits the rest.
PLAN = {
    '01-intro':      [('card', 'AI-B1', 1.0)],
    '02-what-is-it': [('clip', '01-landing-hero')],
    '03-problem':    [('card', 'AI-B2', 0.4), ('clip', '02-meet-the-network')],
    '04-who-for':    [('card', 'TITLE-1', 0.35), ('clip', '18-mobile-landing')],
    '05-apply':      [('clip', '03-family-apply'), ('clip', '04-nanny-application-status')],
    '06-vetting':    [('clip', '05-admin-dashboard'), ('clip', '06-admin-vetting')],
    '07-browse':     [('clip', '08-family-browse-nannies'), ('clip', '09-nanny-profile')],
    '08-booking':    [('clip', '10-family-book-confirmed')],
    '09-emergency':  [('clip', '11-family-last-minute'), ('clip', '12-nanny-job-board-claim')],
    '10-nannies':    [('clip', '13-nanny-dashboard', 6.0), ('clip', '14-nanny-own-profile')],
    '11-reviews':    [('clip', '15-family-review'), ('clip', '16-admin-bookings', 8.0)],
    '12-roadmap':    [('card', 'ROADMAP', 0.7), ('clip', '17-admin-settings', 5.0)],
    '13-okrs':       [('card', 'OKR', 1.0)],
    '14-team':       [('card', 'TEAM', 1.0)],
    '15-values':     [('card', 'AI-B5', 1.0)],
    '16-outro':      [('card', 'OUTRO', 1.0)],
}

vo = json.load(open(os.path.join(VO, 'durations.json')))
clip_len = json.load(open(os.path.join(CLIPS, 'durations.json')))
V = ['-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '30']
A = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']

segments, t = [], 0.0
for beat, shots in PLAN.items():
    clips = [s for s in shots if s[0] == 'clip']
    # A clip may carry a max usable length (e.g. 13 has a loading spinner after ~6 s).
    usable = {s[1]: (s[2] if len(s) > 2 else clip_len[s[1]]['seconds']) for s in clips}
    speed_cap = {c: max(1.0, min(MAX_SPEED, MAX_TOTAL_SPEED / clip_len[c]['speed'])) for c in usable}
    slot = {c: usable[c] / speed_cap[c] for c in usable}  # shortest each clip may play
    card_share = sum(s[2] for s in shots if s[0] == 'card')
    need = sum(slot.values()) / (1 - card_share) if clips else 0
    L = max(LEAD + vo[beat]['seconds'] + TAIL, need)
    card_time = card_share * L
    total_slot = sum(slot.values()) or 1
    inputs, filters = [], []
    for i, s in enumerate(shots):
        if s[0] == 'card':
            d = s[2] * L
            inputs += ['-loop', '1', '-t', f'{d:.3f}', '-i', os.path.join(CARDS, s[1] + '.png')]
            filters.append(f'[{i}:v]scale=1920:1080,setsar=1,fps=30,format=yuv420p[v{i}]')
        else:
            d = (L - card_time) * slot[s[1]] / total_slot
            sp = max(1.0, usable[s[1]] / d)  # speed up to fit; if the beat is longer, hold
            inputs += ['-i', os.path.join(CLIPS, s[1] + '.mp4')]
            filters.append(f'[{i}:v]trim=0:{usable[s[1]]:.3f},setpts=(PTS-STARTPTS)/{sp:.4f},'
                           f'tpad=stop_mode=clone:stop_duration={d:.3f},trim=0:{d:.3f},'
                           f'setsar=1,fps=30,format=yuv420p[v{i}]')
    n = len(shots)
    audio = os.path.join(VO, beat + '.m4a')
    inputs += ['-i', audio]
    filters.append(''.join(f'[v{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=0[v]')
    filters.append(f'[{n}:a]adelay={int(LEAD * 1000)}:all=1,apad,atrim=0:{L:.3f}[a]')
    out = os.path.join(WORK, beat + '.mp4')
    subprocess.run([FF, '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filters),
                    '-map', '[v]', '-map', '[a]', '-t', f'{L:.3f}', *V, *A, out], check=True)
    segments.append(out)
    print(f'{int(t // 60)}:{t % 60:04.1f}  {beat:<14} {L:5.1f}s')
    t += L

lst = os.path.join(WORK, 'list.txt')
with open(lst, 'w') as f:
    f.writelines(f"file '{s}'\n" for s in segments)
final = os.path.join(ROOT, 'rough-cut.mp4')
subprocess.run([FF, '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy',
                '-movflags', '+faststart', final], check=True)
print(f'rough-cut.mp4  {int(t // 60)}:{t % 60:04.1f}  ({t:.1f}s)')
