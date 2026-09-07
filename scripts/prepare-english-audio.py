"""Build the declared lesson clips; requires edge-tts and imageio-ffmpeg.

Original source files are supplied with --source-dir, never fetched implicitly.
BBC excerpts and authored practice recordings are kept distinct in the manifest.
"""
import argparse
import asyncio
import json
import hashlib
import re
import subprocess
import tempfile
from pathlib import Path

import edge_tts
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
COURSES = json.loads((ROOT / 'lib/english/courses.json').read_text())
VIDEOS = {'hello': 'I_tRSrPru94', 'routine': 'bq6GBbh3uhU', 'food': '4C4wlOAscvY'}
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
OUTPUT = ROOT / 'public/english'

def run(*args):
    subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)

def duration(path):
    result = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True)
    found = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', result.stderr)
    if not found:
        raise RuntimeError(f'Cannot read audio duration: {path}')
    h, m, s = map(float, found.groups())
    return round(h * 3600 + m * 60 + s, 3)

async def main(source_dir):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    fingerprints_path = ROOT / 'lib/english/audio-inputs.json'
    fingerprints = json.loads(fingerprints_path.read_text()) if fingerprints_path.exists() else {}
    next_fingerprints = {}
    semaphore = asyncio.Semaphore(3)
    async def speak(text, path, voice='en-GB-SoniaNeural'):
        fingerprint = hashlib.sha256(f'{text}|{voice}|-10%'.encode()).hexdigest()
        next_fingerprints[path.name] = fingerprint
        if fingerprints.get(path.name) == fingerprint and path.exists() and path.stat().st_size > 1000:
            return
        async with semaphore:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, voice, rate='-10%').save(str(path))
                    print(f'Prepared {path.name}', flush=True)
                    return
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2)
    jobs = []
    for c in COURSES:
        for i, line in enumerate(c['lines']):
            jobs.append(speak(line['en'], OUTPUT / f"{c['id']}-line-{i}.mp3", 'en-GB-SoniaNeural' if i % 2 == 0 else 'en-GB-RyanNeural'))
        for kind in ['phrases', 'vocab']:
            for i, item in enumerate(c[kind]):
                jobs.append(speak(item.get('spoken', item['text']), OUTPUT / f"{c['id']}-{kind}-{i}.mp3"))
    await asyncio.gather(*jobs)
    manifest = {}
    with tempfile.TemporaryDirectory(prefix='english-concat-') as temp:
        for c in COURSES:
            lesson_id = c['id']
            original = OUTPUT / f'{lesson_id}-original.m4a'
            run('-ss', c['sourceStart'], '-i', Path(source_dir) / f'english-{VIDEOS[lesson_id]}.m4a', '-t', c['sourceEnd'] - c['sourceStart'], '-vn', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', original)
            parts = []
            timeline = []
            clock = 0
            for i, line in enumerate(c['lines']):
                source = OUTPUT / f'{lesson_id}-line-{i}.mp3'
                wav = Path(temp) / f'{lesson_id}-{i}.wav'
                run('-i', source, '-af', 'apad=pad_dur=0.55', '-ar', '24000', '-ac', '1', wav)
                length = duration(wav)
                timeline.append({'start': round(clock, 3), 'end': round(clock + length, 3)})
                clock += length
                parts.append(wav)
            listing = Path(temp) / f'{lesson_id}.txt'
            listing.write_text('\n'.join(f"file '{p}'" for p in parts))
            practice = OUTPUT / f'{lesson_id}-practice.m4a'
            run('-f', 'concat', '-safe', '0', '-i', listing, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', practice)
            manifest[lesson_id] = {'sourceDuration': duration(original), 'practiceDuration': duration(practice), 'timeline': timeline, 'voice': 'en-GB-SoniaNeural / en-GB-RyanNeural', 'practiceKind': 'authored AI-voiced dialogue'}
    (ROOT / 'lib/english/audio-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    fingerprints_path.write_text(json.dumps(next_fingerprints, indent=2) + '\n')
    print('All 54 audio assets and timing manifests are ready.', flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', required=True)
    asyncio.run(main(parser.parse_args().source_dir))
