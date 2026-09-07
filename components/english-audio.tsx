'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Repeat2, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export function time(seconds: number) {
  return Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
    : '0:00';
}
export function stopAllAudio() {
  window.dispatchEvent(new CustomEvent('little-english-audio', { detail: '' }));
}

export function AudioPlayer({
  src,
  label,
  compact = false,
  onTime,
  onEnded,
}: {
  src: string;
  label: string;
  compact?: boolean;
  onTime?: (time: number) => void;
  onEnded?: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const el = ref.current;
    const stop = (event: Event) => {
      if ((event as CustomEvent).detail !== id) el?.pause();
    };
    window.addEventListener('little-english-audio', stop);
    return () => {
      el?.pause();
      window.removeEventListener('little-english-audio', stop);
    };
  }, [id]);
  useEffect(() => {
    setPlaying(false);
    setElapsed(0);
    setDuration(0);
    setError('');
  }, [src]);
  async function play(restart = false) {
    const el = ref.current;
    if (!el) return;
    if (!restart && !el.paused) {
      el.pause();
      return;
    }
    if (restart || el.ended) el.currentTime = 0;
    el.playbackRate = rate;
    window.dispatchEvent(
      new CustomEvent('little-english-audio', { detail: id }),
    );
    try {
      await el.play();
      setError('');
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        setError('音频暂时无法播放，请检查网络后重试。');
    }
  }
  return (
    <div className={compact ? 'clip-control' : 'audio-player'}>
      <audio
        ref={ref}
        src={src}
        preload={compact ? 'none' : 'metadata'}
        loop={loop}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
        onError={() => setError('音频加载失败，请刷新重试。')}
        onTimeUpdate={(e) => {
          setElapsed(e.currentTarget.currentTime);
          onTime?.(e.currentTarget.currentTime);
        }}
      />
      <button
        type="button"
        className={`audio-play ${playing ? 'playing' : ''}`}
        onClick={() => void play()}
        aria-label={`${playing ? '暂停' : '播放'}${label}`}
        title={`${playing ? '暂停' : '播放'}${label}`}
      >
        {playing ? (
          <Pause size={compact ? 17 : 21} />
        ) : compact ? (
          <Volume2 size={18} />
        ) : (
          <Play size={21} fill="currentColor" />
        )}
      </button>
      {!compact && (
        <>
          <div className="audio-middle">
            <div>
              <b>{label}</b>
              <span>
                {time(elapsed)} / {time(duration)}
              </span>
            </div>
            <Slider
              aria-label={`${label}进度`}
              value={[elapsed]}
              min={0}
              max={duration || 1}
              step={0.05}
              onValueChange={(value) => {
                const seconds = Array.isArray(value) ? value[0] : value;
                if (ref.current && duration) {
                  ref.current.currentTime = seconds;
                  setElapsed(seconds);
                }
              }}
            />
          </div>
          <div className="audio-options">
            <select
              aria-label="播放速度"
              value={rate}
              onChange={(e) => {
                const next = Number(e.target.value);
                setRate(next);
                if (ref.current) ref.current.playbackRate = next;
              }}
            >
              {[0.65, 0.8, 1, 1.2].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setLoop(!loop)}
              aria-label="循环播放"
              aria-pressed={loop}
              className={loop ? 'selected' : ''}
              title="循环播放"
            >
              <Repeat2 size={18} />
            </button>
            <button
              type="button"
              onClick={() => void play(true)}
              aria-label="从头播放"
              title="从头播放"
            >
              <RotateCcw size={17} />
            </button>
          </div>
        </>
      )}
      {error && (
        <span className="audio-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
