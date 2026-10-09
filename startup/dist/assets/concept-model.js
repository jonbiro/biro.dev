(() => {
  'use strict';
  const situations = {
    work: {
      tasks: [
        {context:'The report you’ve been putting off', low:['Open a blank document.','Give it a working title. That’s enough for a beginning.'], steady:['Write three rough headings.','Make a simple outline. The wording can be messy.'], why:'A small setup step lowers the barrier to beginning without asking you to finish the report.'},
        {context:'A message waiting for a reply',low:['Read the message once.','Find the one question you need to answer.'],steady:['Draft a two-sentence reply.','Answer the main question. You can review it before sending.'],why:'Separating reading from responding makes this open loop easier to approach.'},
        {context:'Tomorrow’s first task',low:['Name tomorrow’s first step.','Write one action you can begin without more planning.'],steady:['Set out what you’ll need.','Open the right file and write a brief starting note.'],why:'A clear starting point reduces the decisions waiting for you tomorrow.'}
      ], upcoming:['Review the draft after the first version exists.','Confirm what the next meeting needs.'],later:['Organize the reference folder.','Explore a new note-taking system.']
    },
    routine: {
      tasks:[
        {context:'Getting ready for tomorrow',low:['Put your bag by the door.','Choose its spot. You don’t need to pack everything yet.'],steady:['Pack tomorrow’s essentials.','Start with keys, a charger, and anything you already know you’ll need.'],why:'Preparing one visible cue makes the next transition easier to notice and begin.'},
        {context:'An evening reset',low:['Clear one small space.','Move just one item off the counter.'],steady:['Reset one corner of the counter.','Stay with this one area; the whole room can wait.'],why:'A clear boundary keeps a reset from turning into an open-ended cleaning project.'},
        {context:'A calmer morning',low:['Choose a breakfast option.','Pick something familiar and easy.'],steady:['Set out what breakfast needs.','Prepare the bowl or ingredients that are safe to leave out.'],why:'A small decision tonight can remove one decision from the morning.'}
      ],upcoming:['Check what the next school or work day needs.','Adjust the routine after trying it.'],later:['Reorganize the entryway.','Plan a full kitchen reset.']
    },
    home: {
      tasks:[
        {context:'Laundry that keeps getting deferred',low:['Gather one small load.','Start with the clothes already within reach.'],steady:['Start one load of laundry.','Choose one load and get the machine going. Folding is a separate step.'],why:'Giving a household task a concrete boundary makes it easier to start without taking on every stage at once.'},
        {context:'A responsibility with an unclear owner',low:['Name the next handoff.','Write who needs to take the next step. This example sends no messages.'],steady:['Draft a clear handoff.','Write the action, the person, and when it would be useful. Review before sharing.'],why:'Making the next owner explicit can reduce the work of silently tracking a shared responsibility.'},
        {context:'Something you’re waiting on',low:['Write down the open loop.','Name what you’re waiting for and who has the next move.'],steady:['Choose a follow-up day.','Decide when to check back so you don’t have to keep remembering it.'],why:'A visible follow-up point gives a waiting item a place outside your working memory.'}
      ],upcoming:['Check whether the household handoff needs a follow-up.','Review the week’s shared commitments.'],later:['Sort the storage cupboard.','Plan a bigger household reset.']
    }
  };
  function create(now = () => Date.now()) {
    let scenario='work',energy='low',selected=0,phase='idle',remaining=120,deadline=0,completed=new Set(),notes={};
    const duration=()=>energy==='low'?120:300;
    const locked=()=>['running','paused','elapsed'].includes(phase);
    function reset(){phase='idle';remaining=duration();deadline=0;selected=0;completed=new Set();notes={};}
    function tick(){if(phase==='running'){remaining=Math.max(0,Math.ceil((deadline-now())/1000));if(!remaining)phase='elapsed';}}
    function snapshot(){tick();const task=situations[scenario].tasks[selected];return {scenario,energy,selected,phase,remaining,locked:locked(),completed:[...completed],note:notes[selected]||'',duration:duration(),task:{...task,title:task[energy][0],step:task[energy][1]},situation:situations[scenario]};}
    function act(type,value){
      tick();
      if(type==='reset'){reset();return true;}
      if(type==='stop'&&locked()){phase='idle';remaining=duration();deadline=0;return true;}
      if(type==='smaller'&&energy==='steady'&&phase!=='done'){energy='low';phase='idle';remaining=duration();deadline=0;return true;}
      if(type==='undo'&&phase==='done'){completed.delete(selected);phase='idle';remaining=duration();return true;}
      if(type==='scenario'&&!locked()&&situations[value]){scenario=value;reset();return true;}
      if(type==='energy'&&!locked()&&['low','steady'].includes(value)){energy=value;remaining=duration();return true;}
      if(type==='select'&&!locked()&&Number.isInteger(value)&&value>=0&&value<3&&!completed.has(value)){selected=value;phase='idle';remaining=duration();return true;}
      if(type==='note'){notes[selected]=String(value).slice(0,240);return true;}
      if(type==='done'&&phase!=='done'){completed.add(selected);phase='done';deadline=0;return true;}
      if(type==='primary'){
        if(phase==='running'){phase='paused';return true;}
        if(phase==='idle'||phase==='paused'){deadline=now()+remaining*1000;phase='running';return true;}
        if(phase==='elapsed'){remaining=duration();deadline=now()+remaining*1000;phase='running';return true;}
        if(phase==='done'){const next=situations[scenario].tasks.findIndex((_,i)=>!completed.has(i));if(next<0)reset();else{selected=next;phase='idle';remaining=duration();}return true;}
      }
      return false;
    }
    return {snapshot,act};
  }
  const api={create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else globalThis.AddvancedFocusModel=api;
})();
