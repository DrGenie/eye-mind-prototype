// LOGIN & TAB CONTROL
const VALID_USER = 'testuser', VALID_PASS = 'welcome123';
let failedAttempts = 0, reminders = [], badges = [];

const loginForm    = document.getElementById('loginForm');
const loginMsg     = document.getElementById('loginMsg');
const securityTips = document.getElementById('securityTips');
const loginSection = document.getElementById('loginSection');
const appContent   = document.getElementById('appContent');

function enableTab(sel) {
  const btn = document.querySelector(`[data-bs-target="${sel}"]`);
  btn.removeAttribute('disabled');
  btn.classList.remove('disabled');
}
function showTab(sel) {
  new bootstrap.Tab(document.querySelector(`[data-bs-target="${sel}"]`)).show();
}
function showError(msg){ loginMsg.innerText=msg; loginMsg.className='text-danger'; }
function showSuccess(msg){ loginMsg.innerText=msg; loginMsg.className='text-success'; }

loginForm.addEventListener('submit', e=>{
  e.preventDefault();
  const u=document.getElementById('username').value.trim();
  const p=document.getElementById('password').value;
  if(!u||!p){ showError('Enter both fields.'); return; }
  if(u===VALID_USER && p===VALID_PASS){
    showSuccess('Login successful!');
    failedAttempts=0;
    securityTips.classList.add('d-none');
    enableTab('#ai');
    setTimeout(()=>{
      loginSection.classList.add('d-none');
      appContent.classList.remove('d-none');
      showTab('#ai');
      awardBadge('Social Starter');
    },500);
  } else {
    failedAttempts++;
    if(failedAttempts>=5){
      loginForm.querySelector('button').disabled=true;
      showError('Locked after 5 failed attempts.');
      securityTips.classList.remove('d-none');
    } else if(failedAttempts>=3){
      showError(`Invalid (${failedAttempts}/5). Possible attack?`);
      securityTips.classList.remove('d-none');
    } else {
      showError(`Invalid (${failedAttempts}/5).`);
    }
  }
});

// AI RISK
const calcScoreBtn = document.getElementById('calcScoreBtn');
const riskResult   = document.getElementById('riskResult');
calcScoreBtn.onclick = ()=>{
  const s = +q1.value + +q2.value;
  const lvl = s<=1?'Low':s<=2?'Moderate':'High';
  riskResult.innerHTML=`<strong>${lvl}</strong> risk (Score ${s}/4)`;
  riskResult.className=(lvl==='High'?'text-danger ':'text-success ')+'fs-5';
  enableTab('#gaze');
};

// GAZE
const calArea          = document.getElementById('calArea');
const calMsg           = document.getElementById('calMsg');
const gazeControls     = document.getElementById('gazeControls');
const startCal         = document.getElementById('startCal');
const startGaze        = document.getElementById('startGaze');
const stopGaze         = document.getElementById('stopGaze');
const toggleHeatmapBtn = document.getElementById('toggleHeatmap');
const scanCanvas       = document.getElementById('scanCanvas');
const gazeStats        = document.getElementById('gazeStats');

let heatmap, calibrated=false, tracking=false, heatmapVisible=false;
let gazeData=[], fixations=[], lastPos=null, fixStart=null, lastTime=0;

function resizeCanvas(){
  scanCanvas.width=scanCanvas.clientWidth;
  scanCanvas.height=200;
}
window.addEventListener('resize',resizeCanvas);
resizeCanvas();

startCal.onclick=()=>{
  calMsg.innerText='Tap each dot to calibrate.';
  calArea.innerHTML=`
    <img src="https://via.placeholder.com/600x300" class="w-100 h-100" alt=""/>
    <div id="heatmapContainer" style="position:absolute;top:0;left:0;width:100%;height:100%"></div>
    <div id="gazeDot" style="position:absolute;width:12px;height:12px;
         background:red;border-radius:50%;display:none;pointer-events:none;"></div>`;
  gazeControls.classList.add('d-none');
  calibrated=false; gazeData=[]; fixations=[];
  const pts=[{l:'10%',t:'10%'},{l:'90%',t:'10%'},{l:'90%',t:'90%'},{l:'10%',t:'90%'}];
  let cnt=0;
  pts.forEach(pt=>{
    const d=document.createElement('div');
    d.className='cal-dot'; d.style.left=pt.l; d.style.top=pt.t;
    d.onclick=()=>{ d.style.background='green'; if(++cnt===4){ calibrated=true; calMsg.innerText='Calibrated!'; gazeControls.classList.remove('d-none'); enableTab('#dce'); } };
    calArea.appendChild(d);
  });
};

startGaze.onclick=()=>{
  if(!calibrated){ alert('Calibrate first'); return; }
  tracking=true; startGaze.disabled=true; stopGaze.disabled=false;
  calArea.onmousemove=handleGaze;
  heatmap=h337.create({container:document.getElementById('heatmapContainer'),radius:30});
};

stopGaze.onclick=()=>{
  tracking=false; startGaze.disabled=false; stopGaze.disabled=true;
  calArea.onmousemove=null; updateGazeStats(); enableTab('#dce');
};

toggleHeatmapBtn.onclick=()=>{
  heatmapVisible=!heatmapVisible;
  toggleHeatmapBtn.innerText=heatmapVisible?'Reset Heatmap':'Show Heatmap';
  if(heatmapVisible) heatmap.setData({max:10,data:gazeData});
  else document.getElementById('heatmapContainer').innerHTML='';
};

function handleGaze(e){
  const x=e.offsetX,y=e.offsetY,t=Date.now();
  gazeData.push({x,y,value:1});
  const ctx=scanCanvas.getContext('2d');
  ctx.fillStyle='rgba(255,0,0,0.6)'; ctx.beginPath();
  ctx.arc(x/600*scanCanvas.width,y/300*scanCanvas.height,4,0,2*Math.PI);
  ctx.fill();
  if(lastPos&&tracking){
    const d=Math.hypot(x-lastPos.x,y-lastPos.y);
    if(d<30){
      if(!fixStart) fixStart={x:lastPos.x,y:lastPos.y,t:lastTime};
    } else if(fixStart){
      fixations.push({x:fixStart.x,y:fixStart.y,dur:lastTime-fixStart.t});
      fixStart=null;
    }
  }
  const dot=document.getElementById('gazeDot');
  dot.style.display='block'; dot.style.left=`${x}px`; dot.style.top=`${y}px`;
  lastPos={x,y}; lastTime=t;
}

function updateGazeStats(){
  if(fixStart) fixations.push({x:fixStart.x,y:fixStart.y,dur:Date.now()-fixStart.t});
  const c=fixations.length;
  const avgDur=c?(fixations.reduce((s,f)=>s+f.dur,0)/c).toFixed(0):0;
  let sac=0;
  for(let i=1;i<fixations.length;i++){
    sac+=Math.hypot(fixations[i].x-fixations[i-1].x,fixations[i].y-fixations[i-1].y);
  }
  const avgSac=fixations.length>1?(sac/(fixations.length-1)).toFixed(1):0;
  gazeStats.innerHTML=`
    <p><strong>Fixations:</strong> ${c}</p>
    <p><strong>Avg duration:</strong> ${avgDur} ms</p>
    <p><strong>Avg saccade:</strong> ${avgSac}px</p>`;
}

// DCE
document.getElementById('submitDCE').onclick=()=>{
  const c1=document.querySelector('input[name="sc1"]:checked')?.value;
  const c2=document.querySelector('input[name="sc2"]:checked')?.value;
  const c3=document.querySelector('input[name="sc3"]:checked')?.value;
  let v=0,i=0,g=0,h=0,l=0;
  if(c1==='A'){i++;l++;g++;}else{v++;h++;}
  if(c2==='A'){g++;h++;}else{g++;l++;}
  if(c3==='A'){i++;l++;}else{v++;h++;}
  const mode=v>=i?'Virtual':'In-Person';
  const size=g>=1?'Group':'One-on-One';
  const freq=h>=l?'Frequent':'Less Frequent';
  dceResult.innerHTML=`
    <ul>
      <li><strong>Mode:</strong> ${mode}</li>
      <li><strong>Setting:</strong> ${size}</li>
      <li><strong>Frequency:</strong> ${freq}</li>
    </ul>`;
  enableTab('#recs');
};

// Recommendations & audio & reminders & badges & PDF
function awardBadge(name){
  if(badges.includes(name)) return;
  badges.push(name);
  const b=document.createElement('span');
  b.className='badge bg-success me-1'; b.innerText=name;
  document.getElementById('badges').appendChild(b);
}

document.querySelector('[data-bs-target="#recs"]').addEventListener('shown.bs.tab',()=>{
  const recs=[];
  const rl=riskResult.innerText.split(' ')[0];
  recs.push( rl==='High'
    ? '<li>Join a daily online support group.</li>'
    : '<li>Keep up your social routines.</li>' );
  recommendations.innerHTML=`<ol>${recs.join('')}</ol>`;
  awardBadge('Recommendations Viewed');
  enableTab('#summary');
});

let recorder, audioChunks=[];
navigator.mediaDevices.getUserMedia({audio:true}).then(s=>{
  recorder=new MediaRecorder(s);
  recorder.ondataavailable=e=>audioChunks.push(e.data);
  recorder.onstop=()=>{
    const blob=new Blob(audioChunks,{type:'audio/webm'});
    const url=URL.createObjectURL(blob);
    audioMsg.innerHTML=`<audio controls src="${url}"></audio>`;
    awardBadge('Audio Express');
  };
});

startAudio.onclick=()=>{
  audioChunks=[]; recorder.start();
  startAudio.disabled=true; stopAudio.disabled=false;
  audioMsg.innerText='Recording…';
};
stopAudio.onclick=()=>{
  recorder.stop();
  startAudio.disabled=false; stopAudio.disabled=true;
};

setReminder.onclick=()=>{
  const dt=reminderTime.value; if(!dt) return;
  reminders.push(dt);
  const li=document.createElement('li');
  li.className='list-group-item'; li.innerText=new Date(dt).toLocaleString();
  reminderList.appendChild(li);
  awardBadge('Planner');
};

document.querySelector('[data-bs-target="#summary"]').addEventListener('shown.bs.tab',()=>{
  const sum=`
    <h5>Risk Level:</h5><p>${riskResult.innerText}</p>
    <h5>Preferences:</h5>${dceResult.innerHTML}
    <h5>Badges:</h5><p>${badges.join(', ')}</p>
    <h5>Reminders:</h5><ul>${reminders.map(r=>`<li>${new Date(r).toLocaleString()}</li>`).join('')}</ul>
  `;
  summaryContent.innerHTML=sum;
});
generatePDF.onclick=()=>{
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF();
  doc.html(summaryContent,{callback(pdf){pdf.save('EyeMind_Summary.pdf');},x:10,y:10,width:180});
};
