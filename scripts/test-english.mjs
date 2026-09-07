import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const code = ts.transpileModule(fs.readFileSync(root+'lib/english/storage.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { emptyLesson, emptyState, parseState, matches, gradeAnswer, revealAnswer, retryAnswer, readState, writeState, STORAGE_KEY } = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert(matches(' MY NAME IS! ', 'My name is'));
assert(matches('I’m', 'I am'));
assert(matches('7:30', 'half past seven', ['7:30', 'seven thirty']));
assert(!matches('half past eight', 'half past seven'));
assert(!matches('', 'before'));
assert(!matches('before', 'after'));
let p = gradeAnswer(emptyLesson(),'line-0',false);
assert.deepEqual(p.mistakes,['line-0']);
p = gradeAnswer(revealAnswer(p,'line-0'),'line-0',true);
assert.equal(p.mastered.length,0,'Looking at the answer must not earn independent credit');
assert.deepEqual(p.mistakes,['line-0']);
p = gradeAnswer(retryAnswer(p,'line-0'),'line-0',true);
assert.deepEqual(p.mastered,['line-0']);
assert.deepEqual(p.mistakes,[]);
p = gradeAnswer(p,'line-0',true);
assert.equal(p.mastered.length,1,'Repeated correct answers cannot inflate scores');
assert.deepEqual(parseState(null),emptyState());
const corrupt = parseState({lessons:{hello:{step:100,completed:[1,1,8,'2'],answers:{'line-0':23},mastered:null,results:[]},evil:{}},activity:[1,'2026-09-07'],lastLesson:'evil'});
assert.equal(corrupt.lessons.hello.step,5);
assert.deepEqual(corrupt.lessons.hello.completed,[1]);
assert.deepEqual(corrupt.lessons.hello.answers,{});
assert(!corrupt.lessons.evil);
assert.equal(corrupt.lastLesson,'hello');
const memory=new Map([['old-french-progress','preserve-me']]);
globalThis.localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
const state={...emptyState(),lessons:{hello:{...p,step:3,outputChecks:[0],draft:'I enjoy learning English.'}},activity:['2026-09-07']};
assert(writeState(state));assert.deepEqual(readState(),state);assert.equal(memory.get('old-french-progress'),'preserve-me');
memory.set(STORAGE_KEY,'invalid json');assert.deepEqual(readState(),emptyState());
globalThis.localStorage={getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('quota')}};
assert.deepEqual(readState(),emptyState());assert.equal(writeState(state),false);

const courses=JSON.parse(fs.readFileSync(root+'lib/english/courses.json','utf8'));
const manifest=JSON.parse(fs.readFileSync(root+'lib/english/audio-manifest.json','utf8'));
assert.deepEqual(courses.map(c=>c.id),['hello','routine','food']);
let count=0;
for(const course of courses){
  assert.equal(course.lines.length,8);assert.equal(course.grammar.length,3);assert.equal(course.outputChecklist.length,3);
  assert(course.sourceText.split(/\s+/).length<=25,'Keep source excerpts short');
  for(const quiz of [course.quiz,course.sourceQuestion])assert(quiz.correct>=0&&quiz.correct<quiz.options.length);
  const timing=manifest[course.id];assert.equal(timing.timeline.length,8);
  assert(Math.abs(timing.sourceDuration-(course.sourceEnd-course.sourceStart))<.1);
  assert(Math.abs(timing.practiceDuration-timing.timeline.at(-1).end)<.1);
  assert(fs.statSync(root+`public/english/${course.id}.jpg`).size>1000);
  const files=['original.m4a','practice.m4a'];
  for(const [i,line] of course.lines.entries()){
    assert(line.en.includes(line.answer),`${course.id}/${i} gap exists`);
    assert(line.en.includes(line.focus));assert(line.zh&&line.tip&&line.hint);
    assert(matches(line.answer,line.answer,line.alternatives));
    assert(timing.timeline[i].end>timing.timeline[i].start);
    if(i)assert(Math.abs(timing.timeline[i].start-timing.timeline[i-1].end)<.02);
    files.push(`line-${i}.mp3`);
  }
  for(const kind of ['phrases','vocab']){assert.equal(course[kind].length,4);course[kind].forEach((w,i)=>{assert(w.ipa&&w.example&&w.zh&&w.note);files.push(`${kind}-${i}.mp3`);});}
  for(const f of files){const data=fs.readFileSync(root+`public/english/${course.id}-${f}`);assert(data.length>1000);if(f.endsWith('.m4a'))assert.equal(data.toString('ascii',4,8),'ftyp');count++;}
}
assert.equal(count,54);
for(const base of ['http://localhost:3000/lesson?id=hello','https://zhensun.cn/learn_lang/lesson/?id=hello']){
  const next=new URL('../lesson/?id=routine',base);
  assert(next.pathname.endsWith('/lesson/'));
  assert.equal(next.searchParams.get('id'),'routine');
}
console.log('PASS: answer matching, independent-credit rules, retry, robust storage, 3 complete lessons, 24 exercises, 54 audio assets, and aligned timelines.');
const teacher=JSON.parse(fs.readFileSync(root+'lib/english/teacher-notes.json','utf8'));
for(const c of courses){
  const t=teacher[c.id];
  assert.equal(t.zhFocus.length,8);assert.equal(t.words.length,4);assert.equal(t.reviews.length,3);
  assert.equal(t.phraseZh.length,4);assert.equal(t.wordExampleZh.length,4);
  c.lines.forEach((l,i)=>assert(l.zh.includes(t.zhFocus[i]),`${c.id} Chinese focus ${i} exists`));
  t.words.forEach(w=>assert(w.pos&&w.synonym&&w.story));
  t.reviews.forEach(r=>assert(r.formula&&r.example&&r.zh&&r.application&&r.applicationZh));
  const vtt=fs.readFileSync(root+`public/english/${c.id}-study.vtt`,'utf8');
  assert.equal((vtt.match(/ --> /g)||[]).length,8);
  c.lines.forEach(l=>{assert(vtt.includes(l.en));assert(vtt.includes(l.zh));});
  const video=fs.readFileSync(root+`public/english/${c.id}-study.mp4`);assert.equal(video.toString('ascii',4,8),'ftyp');
}
const handout=ts.createSourceFile('page.tsx',fs.readFileSync(root+'app/lesson/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const sections=[];
function visit(node){if(ts.isJsxOpeningElement(node)&&node.tagName.getText(handout)==='Section'){const title=node.attributes.properties.find(p=>p.name?.getText(handout)==='title');sections.push(title.initializer.text);}ts.forEachChild(node,visit);}
visit(handout);
assert.deepEqual(sections,['用英语说出这段话','看无字幕视频','听音频填空','中英对照','本期精讲','文本回顾','相关文化']);
console.log('PASS: seven reference sections in order, complete teacher notes, aligned Chinese highlights and 24 bilingual subtitle cues.');
