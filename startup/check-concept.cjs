// Focused checks for timer and pause/return state. No browser simulation.
const assert=require('node:assert/strict');
const {create}=require('./dist/assets/concept-model.js');
let now=1000;const model=create(()=>now);
assert.equal(model.snapshot().task.title,'Open a blank document.');
assert.equal(model.snapshot().remaining,120);
model.act('primary');now+=31000;assert.equal(model.snapshot().remaining,89);
model.act('primary');assert.equal(model.snapshot().phase,'paused');
model.act('note','Return to the introduction.');now+=600000;
assert.equal(model.snapshot().remaining,89);assert.equal(model.snapshot().note,'Return to the introduction.');
assert.equal(model.act('energy','steady'),false);assert.equal(model.act('scenario','home'),false);
model.act('primary');now+=90000;assert.equal(model.snapshot().phase,'elapsed');assert.equal(model.snapshot().remaining,0);
model.act('done');assert.deepEqual(model.snapshot().completed,[0]);
model.act('primary');assert.equal(model.snapshot().selected,1);assert.equal(model.snapshot().phase,'idle');
model.act('done');model.act('primary');model.act('done');assert.equal(model.snapshot().completed.length,3);
model.act('primary');assert.equal(model.snapshot().completed.length,0);assert.equal(model.snapshot().note,'');
for(const scenario of ['work','routine','home']){
 model.act('scenario',scenario);
 for(const energy of ['low','steady']){
  model.act('energy',energy);assert.equal(model.snapshot().remaining,energy==='low'?120:300);
  for(let i=0;i<3;i++){assert(model.act('select',i));const s=model.snapshot();assert(s.task.title&&s.task.step&&s.task.why);assert.equal(s.situation.upcoming.length,2);assert.equal(s.situation.later.length,2);}
 }
}
assert.equal(model.act('select',-1),false);assert.equal(model.act('select',3),false);
model.act('note','x'.repeat(300));assert.equal(model.snapshot().note.length,240);
model.act('reset');assert.equal(model.snapshot().note,'');assert.equal(model.snapshot().phase,'idle');
console.log('PASS: countdown, pause across long interruption, note retention, resume/expiry, setting locks, completion/next step, reset, 18 scenario/energy/task combinations, invalid task bounds.');

const controls=create(()=>now);
controls.act('energy','steady');controls.act('primary');now+=17000;
controls.act('note','Continue from heading two.');assert(controls.act('stop'));
assert.equal(controls.snapshot().phase,'idle');assert.equal(controls.snapshot().completed.length,0);assert.equal(controls.snapshot().note,'Continue from heading two.');
controls.act('primary');assert(controls.act('smaller'));assert.equal(controls.snapshot().energy,'low');assert.equal(controls.snapshot().remaining,120);assert.equal(controls.snapshot().phase,'idle');assert.equal(controls.snapshot().note,'Continue from heading two.');
controls.act('done');assert(controls.act('undo'));assert.equal(controls.snapshot().completed.length,0);assert.equal(controls.snapshot().phase,'idle');assert.equal(controls.snapshot().note,'Continue from heading two.');
console.log('PASS: stop without false completion, reduce effort during session, undo completion, and note preservation.');
