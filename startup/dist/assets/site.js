(() => {
  'use strict';
  document.documentElement.classList.add('js-enabled');
  const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-nav');
  const setMenu=open=>{menu?.setAttribute('aria-expanded',String(open));if(menu)menu.textContent=open?'Close menu':'Menu';nav?.classList.toggle('open',open);};
  document.addEventListener('click',event=>{if(event.target.closest('.menu-toggle'))setMenu(menu.getAttribute('aria-expanded')!=='true');if(event.target.closest('#main-nav a'))setMenu(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}});
  const desktop=window.matchMedia('(min-width: 60rem)');
  desktop.addEventListener('change',()=>{const wasInMenu=nav?.contains(document.activeElement);setMenu(false);if(!desktop.matches&&wasInMenu)menu?.focus();});
  document.addEventListener('click',event=>{if(!event.target.closest('.header'))setMenu(false);});

  let root=null,model=null,interval=null;
  const $=id=>root?.querySelector('#'+id);
  const format=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  function showHorizon(horizon,focus=false){
    root.querySelectorAll('[data-horizon]').forEach(tab=>{const active=tab.dataset.horizon===horizon;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$('af-panel-'+tab.dataset.horizon).hidden=!active;if(active&&focus)tab.focus();});
  }
  function announce(text){$('af-announcement').textContent=text;}
  function render(){
    const s=model.snapshot();
    $('af-task-title').textContent=s.task.title;$('af-task-step').textContent=s.task.step;$('af-task-context').textContent=s.task.context;$('af-task-why').textContent=s.task.why;
    $('af-task-meta').textContent=s.energy==='low'?'2 min · Low effort':'5 min · A little more';
    $('af-timer').textContent=format(s.remaining);
    $('af-progress').max=s.duration;$('af-progress').value=s.duration-s.remaining;
    $('af-stop').hidden=!s.locked;$('af-smaller').hidden=s.energy!=='steady'||s.phase==='done';
    const context={work:'A task I’m avoiding',routine:'A routine that feels big',home:'A lot to keep track of'};
    $('af-context-line').textContent=context[s.scenario]+' · '+(s.energy==='low'?'A tiny step':'A little more');
    $('af-return-hint').hidden=!s.note||['paused','elapsed','done'].includes(s.phase);
    $('af-return-hint').textContent=s.note?'Your return note: '+s.note:'';
    $('af-session-label').textContent=({idle:'A little time to begin',running:'One step is enough',paused:'Paused. Your place is here.',elapsed:'Time’s up. You choose what’s next.',done:'A step forward counts.'})[s.phase];
    $('af-primary').textContent=({idle:`Start ${s.duration/60} minutes`,running:'Pause & keep my place',paused:'Resume session',elapsed:`Another ${s.duration/60} minutes`,done:s.completed.length===3?'Start example again':'Choose next small step'})[s.phase];
    $('af-done').hidden=s.phase==='done';$('af-checkpoint').hidden=!['paused','elapsed'].includes(s.phase);$('af-completion').hidden=s.phase!=='done';
    if($('af-return-note').value!==s.note)$('af-return-note').value=s.note;
    root.querySelectorAll('[data-scenario]').forEach(button=>{button.disabled=s.locked;button.setAttribute('aria-pressed',String(button.dataset.scenario===s.scenario));});
    root.querySelectorAll('input[name="demo-energy"]').forEach(input=>{input.disabled=s.locked;input.checked=input.value===s.energy;});
    $('af-settings-help').textContent=s.locked?'Stop this session to choose a different situation or energy level. Your note stays here.':'Choose what fits your energy. You can stop whenever you need.';
    const list=$('af-today-list');list.replaceChildren();
    s.situation.tasks.forEach((task,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.task=String(index);button.disabled=s.locked||s.completed.includes(index);
      const label=document.createElement('strong');label.textContent=task[s.energy][0];
      const meta=document.createElement('span');meta.textContent=s.completed.includes(index)?'Done for now':index===s.selected?'Your current step':'Make this my next step';
      button.append(label,meta);list.append(button);
    });
    for(const kind of ['upcoming','later']){const list=$('af-'+kind+'-list');list.replaceChildren();s.situation[kind].forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});}
  }
  function init(){
    const next=document.querySelector('[data-af-demo]');if(next===root)return;
    if(interval)clearInterval(interval);interval=null;root=next;if(!root)return;
    model=globalThis.AddvancedFocusModel.create();$('af-settings').open=window.matchMedia('(min-width: 47.501rem)').matches;render();
    root.addEventListener('click',event=>{
      const horizon=event.target.closest('[data-horizon]');if(horizon){showHorizon(horizon.dataset.horizon);return;}
      const scenario=event.target.closest('[data-scenario]');if(scenario&&!scenario.disabled){model.act('scenario',scenario.dataset.scenario);render();announce('New situation. Pick a step that feels doable.');return;}
      const task=event.target.closest('[data-task]');if(task&&!task.disabled){model.act('select',Number(task.dataset.task));render();showHorizon('now');$('af-task-title').focus();announce('Your next step is ready.');return;}
      const action=event.target.closest('[data-af-action]');if(!action)return;
      model.act(action.dataset.afAction);render();const s=model.snapshot();
      if(action.dataset.afAction==='reset'){showHorizon('now');$('af-task-title').focus();announce('Example reset. Your session and return notes were cleared.');}
      else if(action.dataset.afAction==='stop'){$('af-primary').focus();announce('Session stopped. The task is still open and your return note is kept.');}
      else if(action.dataset.afAction==='smaller'){$('af-task-title').focus();announce('A smaller step is ready. The timer has stopped; your note is kept.');}
      else if(action.dataset.afAction==='undo'){$('af-primary').focus();announce('Completion undone. Your step is ready again.');}
      else if(action.dataset.afAction==='done'){$('af-primary').focus();announce('Step complete. Continue or leave it here—both are okay.');}
      else if(s.phase==='paused'){announce('Session paused. You can leave a return note.');$('af-return-note').focus();}
      else if(s.phase==='running')announce('Session started. Pause whenever you need.');
      else if(s.phase==='idle')announce('A fresh starting point is ready.');
    });
    root.addEventListener('change',event=>{if(event.target.name==='demo-energy'){model.act('energy',event.target.value);render();announce('Step and session length adjusted to your energy.');}});
    root.addEventListener('input',event=>{if(event.target.id==='af-return-note')model.act('note',event.target.value);});
    root.addEventListener('keydown',event=>{
      const current=event.target.closest('[data-horizon]');if(!current||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const tabs=[...root.querySelectorAll('[data-horizon]')];const i=tabs.indexOf(current);
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;showHorizon(tabs[next].dataset.horizon,true);
    });
    interval=setInterval(()=>{const before=$('af-session-label').textContent;const s=model.snapshot();$('af-timer').textContent=format(s.remaining);$('af-progress').value=s.duration-s.remaining;if(s.phase==='elapsed'&&before!=='Time’s up. You choose what’s next.'){render();announce('Your time is up. Stop here, leave a note, or choose another short session.');}},1000);
  }
  window.addEventListener('biro:routechange',()=>{setMenu(false);init();});
  init();
})();

// Section reveal: additive and optional. Sections stay visible without JavaScript or under reduced motion.
(() => {
  'use strict';
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = document.querySelectorAll('main > *');
  if (!sections.length) return;
  // Anything already on screen stays put, so a late script never hides what the visitor can see.
  sections.forEach((section) => { if (section.getBoundingClientRect().top < window.innerHeight) section.classList.add('is-visible'); });
  document.documentElement.classList.add('js-reveal');
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  sections.forEach((section) => { if (!section.classList.contains('is-visible')) reveal.observe(section); });
  // Keyboard focus reveals its section at once, without the fade, so focus never lands on something invisible.
  document.querySelector('main').addEventListener('focusin', (event) => {
    const section = event.target.closest('main > *');
    if (section && !section.classList.contains('is-visible')) {
      section.style.transition = 'none';
      section.classList.add('is-visible');
      reveal.unobserve(section);
    }
  });
})();

// Pause the constellation's drift while it is off-screen or the tab is hidden.
(() => {
  'use strict';
  const orbits = document.querySelectorAll('.constellation');
  if (!orbits.length || !('IntersectionObserver' in window)) return;
  const visible = new Map();
  const update = (orbit) => orbit.classList.toggle('is-paused', document.hidden || !visible.get(orbit));
  const watch = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      visible.set(entry.target, entry.isIntersecting);
      update(entry.target);
    }
  });
  orbits.forEach((orbit) => watch.observe(orbit));
  document.addEventListener('visibilitychange', () => orbits.forEach(update));
})();
