"""Render installed macOS English/French voices offline with real timings.
Requires macOS say and imageio-ffmpeg. No course text is sent to an external service.
"""
import asyncio
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/handouts'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
COURSES = json.loads((ROOT / 'lib/handouts/practice.json').read_text())

def run(*args):
    subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)

def duration(path):
    r = subprocess.run([FFMPEG, '-i', str(path)], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', r.stderr)
    if not m: raise RuntimeError(f'Invalid audio: {path}')
    h, minute, s = map(float, m.groups())
    return round(h * 3600 + minute * 60 + s, 3)

def stamp(t):
    ms = round(t * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}'

async def main():
    OUT.mkdir(exist_ok=True)
    fp = ROOT / 'lib/handouts/audio-inputs.json'
    previous = json.loads(fp.read_text()) if fp.exists() else {}
    hashes = {}
    semaphore = asyncio.Semaphore(4)
    async def speak(text, name, voice):
        digest = hashlib.sha256(f'{text}|{voice}|145|macOS-offline'.encode()).hexdigest()
        hashes[name] = digest
        target = OUT / name
        if previous.get(name) == digest and target.exists(): return
        async with semaphore:
            for attempt in range(3):
                try:
                    with tempfile.TemporaryDirectory(prefix='handout-say-') as tmp:
                        intermediate = Path(tmp) / 'speech.aiff'
                        proc = await asyncio.create_subprocess_exec('say', '-v', voice, '-r', '145', '-o', str(intermediate), text)
                        if await proc.wait(): raise RuntimeError('Local speech generation failed')
                        run('-i', intermediate, '-c:a', 'libmp3lame', '-b:a', '96k', target)
                    print(name, flush=True)
                    return
                except Exception:
                    if attempt == 2: raise
                    await asyncio.sleep(2)
    jobs = []
    for c in COURSES:
        voices = ['Thomas', 'Thomas'] if c['id'].startswith('fr-') else ['Daniel', 'Daniel']
        for i, line in enumerate(c['lines']):
            jobs.append(speak(line[1], f"{c['id']}-line-{i}.mp3", voices[i % 2]))
        for kind in ['phrases', 'vocab', 'reviews']:
            for i, item in enumerate(c[kind]):
                jobs.append(speak(item[2] if kind == 'reviews' else item[0], f"{c['id']}-{kind}-{i}.mp3", voices[0]))
    await asyncio.gather(*jobs)
    manifest = {}
    with tempfile.TemporaryDirectory(prefix='handout-audio-') as temp:
        for c in COURSES:
            parts, times, elapsed = [], [], 0
            for i, line in enumerate(c['lines']):
                part = Path(temp) / f"{c['id']}-{i}.wav"
                run('-i', OUT / f"{c['id']}-line-{i}.mp3", '-af', 'apad=pad_dur=0.65', '-ar', '24000', '-ac', '1', part)
                length = duration(part)
                times.append({'start': round(elapsed, 3), 'end': round(elapsed + length, 3)})
                elapsed += length
                parts.append(part)
            listing = Path(temp) / f"{c['id']}.txt"
            listing.write_text('\n'.join(f"file '{p}'" for p in parts))
            practice = OUT / f"{c['id']}-practice.m4a"
            run('-f', 'concat', '-safe', '0', '-i', listing, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', practice)
            manifest[c['id']] = {'duration': duration(practice), 'timeline': times, 'language': c['id'][:2], 'voice': 'Thomas (fr_FR)' if c['id'].startswith('fr-') else 'Daniel (en_GB)', 'kind': 'offline macOS synthetic reading of supplied PDF excerpt'}
            # A plain teaching clip, explicitly identified as AI audio, never claimed to be source footage.
            run('-f', 'lavfi', '-i', 'color=c=0x173e57:s=960x540:r=12', '-i', practice, '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', OUT / f"{c['id']}-study.mp4")
            cues = ['WEBVTT', '']
            for line, t in zip(c['lines'], times):
                cues.extend([f"{stamp(t['start'])} --> {stamp(t['end'])}", line[1], line[2], ''])
            (OUT / f"{c['id']}-study.vtt").write_text('\n'.join(cues))
    fp.write_text(json.dumps(hashes, indent=2) + '\n')
    (ROOT / 'lib/handouts/audio-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Complete: {len(hashes)} spoken clips, 6 full audio tracks and teaching videos.', flush=True)

if __name__ == '__main__': asyncio.run(main())
