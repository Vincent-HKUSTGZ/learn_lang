// A simple, explicitly labelled AI-voiced lesson presentation, not BBC footage.
// Both viewing modes and dictation use the exact same audio and timing.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const courses=JSON.parse(fs.readFileSync(root+'lib/english/courses.json','utf8'));
const manifest=JSON.parse(fs.readFileSync(root+'lib/english/audio-manifest.json','utf8'));
const ffmpeg=process.env.LESSON_FFMPEG||'ffmpeg';
function stamp(t){const ms=Math.round(t*1000);return [Math.floor(ms/3600000),Math.floor(ms/60000)%60,Math.floor(ms/1000)%60].map(n=>String(n).padStart(2,'0')).join(':')+'.'+String(ms%1000).padStart(3,'0');}
for(const c of courses){
 const output=root+'public/english/'+c.id+'-study';
 execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x152339:s=960x540:r=12','-i',root+'public/english/'+c.id+'-practice.m4a','-map','0:v','-map','1:a','-c:v','libx264','-tune','stillimage','-pix_fmt','yuv420p','-c:a','copy','-shortest','-movflags','+faststart',output+'.mp4'],{stdio:'inherit'});
 const cues=c.lines.map((line,i)=>{const t=manifest[c.id].timeline[i];return (i+1)+'\n'+stamp(t.start)+' --> '+stamp(t.end)+'\n'+line.en+'\n'+line.zh;});
 fs.writeFileSync(output+'.vtt','WEBVTT\n\n'+cues.join('\n\n')+'\n');
 console.log(c.id+': video and 8 bilingual subtitle cues ready');
}
