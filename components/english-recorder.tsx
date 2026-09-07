'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioPlayer, stopAllAudio } from './english-audio';

export function Recorder({ label }: { label: string }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const urlRef = useRef('');
  const mounted = useRef(true);
  const [url, setUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recorder.current?.state === 'recording' && recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (seconds >= 90 && recorder.current?.state === 'recording')
      recorder.current.stop();
  }, [seconds]);
  async function start() {
    if (pending || recording) return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError(
        '当前浏览器不支持录音。你仍可以大声跟读；录音请使用较新的 Chrome 或 Safari。',
      );
      return;
    }
    stopAllAudio();
    setPending(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const rec = new MediaRecorder(media);
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const next = URL.createObjectURL(
          new Blob(chunks, { type: rec.mimeType }),
        );
        urlRef.current = next;
        setUrl(next);
        setRecording(false);
      };
      rec.onerror = () => {
        media.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setError('录音中断，请再试一次。');
      };
      setError('');
      setSeconds(0);
      rec.start();
      setRecording(true);
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(
        '没有取得麦克风权限。请在浏览器中允许麦克风，或先用文字完成练习。',
      );
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  return (
    <div className="recorder">
      <div className="recorder-actions">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => (recording ? recorder.current?.stop() : void start())}
          className={recording ? 'record-button live' : 'record-button'}
        >
          {recording ? <Square size={16} /> : <Mic size={17} />}{' '}
          {pending
            ? '等待麦克风权限…'
            : recording
              ? `停止录音 · ${seconds}s`
              : '录下我的声音'}
        </Button>
        <span>最长 90 秒 · 仅在本机处理</span>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {url && (
        <>
          <AudioPlayer src={url} label={label} />
          <div className="recording-links">
            <a
              href={url}
              download={`my-english-${Date.now()}.${recorder.current?.mimeType.includes('mp4') ? 'm4a' : 'webm'}`}
            >
              <Download size={15} />
              下载留存
            </a>
            <button
              onClick={() => {
                URL.revokeObjectURL(urlRef.current);
                urlRef.current = '';
                setUrl('');
              }}
            >
              <Trash2 size={15} />
              删除本次录音
            </button>
          </div>
        </>
      )}
      <p className="micro-note">
        听自己的录音，对照重音、连读和停顿。录音刷新后不保留，可下载保存；这里不自动评分口音。
      </p>
    </div>
  );
}
