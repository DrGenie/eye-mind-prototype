// --- Login & Security ---
const VALID_USER = 'testuser';
const VALID_PASS = 'welcome123';
let failedAttempts = 0, reminders = [], badges = [];

// Elements
const loginForm    = document.getElementById('loginForm');
const loginMsg     = document.getElementById('loginMsg');
const securityTips = document.getElementById('securityTips');
const appContent   = document.getElementById('appContent');

loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  if (!user || !pass) {
    showError('Please enter both username and password.');
    return;
  }
  if (user === VALID_USER && pass === VALID_PASS) {
    showSuccess('Login successful!');
    failedAttempts = 0;
    securityTips.classList.add('d-none');
    setTimeout(() => {
      loginForm.parentElement.classList.add('d-none');
      appContent.classList.remove('d-none');
      activateTab('#ai');
      awardBadge('Social Starter');
    }, 500);
  } else {
    failedAttempts++;
    if (failedAttempts >= 5) {
      loginForm.querySelector('button').disabled = true;
      showError('Account locked after 5 failed attempts. Contact support.');
      securityTips.classList.remove('d-none');
    } else if (failedAttempts >= 3) {
      showError(`Invalid credentials (${failedAttempts}/5). Possible attack?`);
      securityTips.classList.remove('d-none');
    } else {
      showError(`Invalid credentials (${failedAttempts}/5).`);
    }
  }
});
function showError(msg){ loginMsg.innerText = msg; loginMsg.className = 'text-danger'; }
function showSuccess(msg){ loginMsg.innerText = msg; loginMsg.className = 'text-success'; }
function activateTab(selector){
  new bootstrap.Tab(document.querySelector(`[data-bs-target="${selector}"]`)).show();
}

// --- AI Risk Assessment ---
const calcScoreBtn = document.getElementById('calcScoreBtn');
const riskResult   = document.getElementById('riskResult');
calcScoreBtn.onclick = () => {
  const v1 = +document.getElementById('q1').value;
  const v2 = +document.getElementById('q2').value;
  const score = v1 + v2;
  const riskLevel = score <= 1 ? 'Low' : score <= 2 ? 'Moderate' : 'High';
  riskResult.innerHTML = `<strong>${riskLevel}</strong> risk (Score ${score}/4)`;
  riskResult.className = (riskLevel==='High'?'text-danger ':'text-success ') + 'fs-5';
};

// --- Gaze Engagement & Calibration ---
const calArea           = document.getElementById('calArea');
const calMsg            = document.getElementById('calMsg');
const gazeControls      = document.getElementById('gazeControls');
const startCal          = document.getElementById('startCal');
const startGaze         = document.getElementById('startGaze');
const stopGaze          = document.getElementById('stopGaze');
const toggleHeatmapBtn  = document.getElementById('toggleHeatmap');
const scanCanvas        = document.getElementById('scanCanvas');
const gazeStats         = document.getElementById('gazeStats');
let heatmap, calibrated=false, tracking=false, heatmapVisible=false;
let gazeData=[], fixations=[], lastPos=null, fixStart=null, lastTime=0;

// Resize scan canvas
function resizeCanvas(){
  scanCanvas.width  = scanCanvas.clientWidth;
  scanCanvas.height = 200;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Calibration
startCal.onclick = () => {
  calMsg.innerText = 'Click all 4 dots to calibrate.';
  calArea.innerHTML = `<img src="https://via.placeholder.com/600x300" class="w-100 h-100" alt="Content"/>
    <div id="heatmapContainer" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
    <div id="gazeDot" style="position:absolute;width:12px;height:12px;background:red;border-radius:50%;display:none;pointer-events:none;"></div>`;
  gazeControls.classList.add('d-none');
  calibrated = false; gazeData=[]; fixations=[];
  const pts = [
    {left:'10%', top:'10%'},
    {left:'90%', top:'10%'},
    {left:'90%', top:'90%'},
    {left:'10%', top:'90%'}
  ];
  let count=0;
  pts.forEach(pt=>{
    const d = document.createElement('div');
    d.className='cal-dot'; d.style.left=pt.left; d.style.top=pt.top;
    d.onclick = () => {
      d.style.background='green';
      if (++count===4) {
        calibrated=true;
        calMsg.innerText='Calibration complete!';
        gazeControls.classList.remove('d-none');
      }
    };
    calArea.appendChild(d);
  });
};

// Gaze tracking
startGaze.onclick = () => {
  if (!calibrated) return alert('Please calibrate first.');
  tracking=true;
  startGaze.disabled=true; stopGaze.disabled=false;
  calArea.onmousemove = handleGaze;
  heatmap = h337.create({ container: document.getElementById('heatmapContainer'), radius:30 });
};
stopGaze.onclick = () => {
  tracking=false;
  startGaze.disabled=false; stopGaze.disabled=true;
  calArea.onmousemove=null;
  updateGazeStats();
};
toggleHeatmapBtn.onclick = () => {
  heatmapVisible = !heatmapVisible;
  toggleHeatmapBtn.innerText = heatmapVisible?'Reset Heatmap':'Show Heatmap';
  if (heatmapVisible) heatmap.setData({max:10, data: gazeData});
  else document.getElementById('heatmapContainer').innerHTML='';
};

function handleGaze(e){
  const x=e.offsetX, y=e.offsetY, t=Date.now();
  gazeData.push({x,y,value:1});
  const ctx = scanCanvas.getContext('2d');
  ctx.fillStyle='rgba(255,0,0,0.6)';
  ctx.beginPath();
  ctx.arc(x/600*scanCanvas.width, y/300*scanCanvas.height, 4,0,2*Math.PI);
  ctx.fill();
  if (lastPos && tracking) {
    const dist = Math.hypot(x-lastPos.x,y-lastPos.y);
    if (dist<30) {
      if (!fixStart) fixStart={x:lastPos.x,y:lastPos.y,t:lastTime};
    } else if (fixStart) {
      fixations.push({x:fixStart.x,y:fixStart.y,dur:lastTime-fixStart.t});
      fixStart=null;
    }
  }
  const dot = document.getElementById('gazeDot');
  dot.style.display='block'; dot.style.left=`${x}px`; dot.style.top=`${y}px`;
  lastPos={x,y}; lastTime=t;
}

function updateGazeStats(){
  if (fixStart) fixations.push({x:fixStart.x,y:fixStart.y,dur:Date.now()-fixStart.t});
  const c = fixations.length;
  const avgDur = c?(fixations.reduce((s,f)=>s+f.dur,0)/c).toFixed(0):0;
  let sacSum=0;
  for (let i=1;i<fixations.length;i++){
    sacSum += Math.hypot(fixations[i].x-fixations[i-1].x, fixations[i].y-fixations[i-1].y);
  }
  const avgSac = fixations.length>1?(sacSum/(fixations.length-1)).toFixed(1):0;
  gazeStats.innerHTML = `
    <p><strong>Fixations:</strong> ${c}</p>
    <p><strong>Avg duration:</strong> ${avgDur} ms</p>
    <p><strong>Avg saccade:</strong> ${avgSac}px</p>`;
}

// --- DCE Preferences ---
document.getElementById('submitDCE').onclick = ()=>{
  const c1 = document.querySelector('input[name="sc1"]:checked')?.value;
  const c2 = document.querySelector('input[name="sc2"]:checked')?.value;
  const c3 = document.querySelector('input[name="sc3"]:checked')?.value;
  let v=0,i=0,g=0,h=0,l=0;
  if(c1==='A'){i++;l++;g++;} else if(c1==='B'){v++;h++;}
  if(c2==='A'){g++;h++;} else if(c2==='B'){g++;l++;}
  if(c3==='A'){i++;l++;} else if(c3==='B'){v++;h++;}
  modePref = v>=i?'Virtual':'In-Person';
  sizePref = g>=1?'Group':'One-on-One';
  freqPref = h>=l?'Frequent':'Less Frequent';
  document.getElementById('dceResult').innerHTML = `
    <ul>
      <li><strong>Mode:</strong> ${modePref}</li>
      <li><strong>Setting:</strong> ${sizePref}</li>
      <li><strong>Frequency:</strong> ${freqPref}</li>
    </ul>`;
};

// --- Recommendations & Audio & Reminders & Badges & PDF ---
function awardBadge(name){
  if (badges.includes(name)) return;
  badges.push(name);
  const el = document.createElement('span');
  el.className='badge bg-success me-1'; el.innerText=name;
  document.getElementById('badges').appendChild(el);
}

document.querySelector('[data-bs-target="#recs"]').addEventListener('shown.bs.tab', ()=>{
  const recs=[];
  const rl = document.getElementById('riskResult').innerText.split(' ')[0];
  if (rl==='High'){
    recs.push(modePref==='Virtual'?'Join a daily online group.':'Attend a weekly meetup.');
  } else if (rl==='Moderate'){
    recs.push(`Schedule ${freqPref.toLowerCase()} chats.`);
  } else {
    recs.push('Great work! Keep connecting.');
  }
  recs.push(modePref==='Virtual'?'Try a chat app.':'Visit local events.');
  document.getElementById('recommendations').innerHTML = `<ol>${recs.map(r=>`<li>${r}</li>`).join('')}</ol>`;
});

let recorder, audioChunks=[];
navigator.mediaDevices.getUserMedia({audio:true})
  .then(stream=>{
    recorder=new MediaRecorder(stream);
    recorder.ondataavailable = e=> audioChunks.push(e.data);
    recorder.onstop = ()=>{
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const url  = URL.createObjectURL(blob);
      document.getElementById('audioMsg').innerHTML =
        `<audio controls src="${url}"></audio>`;
      awardBadge('Audio Express');
    };
  });

document.getElementById('startAudio').onclick = ()=>{
  audioChunks=[]; recorder.start();
  startAudio.disabled=true; stopAudio.disabled=false;
  document.getElementById('audioMsg').innerText='Recording...';
};
document.getElementById('stopAudio').onclick = ()=>{
  recorder.stop();
  startAudio.disabled=false; stopAudio.disabled=true;
};

document.getElementById('setReminder').onclick = ()=>{
  const dt = document.getElementById('reminderTime').value;
  if (!dt) return;
  reminders.push(dt);
  const li = document.createElement('li');
  li.className='list-group-item';
  li.innerText = new Date(dt).toLocaleString();
  document.getElementById('reminderList').appendChild(li);
  document.getElementById('reminderTime').value='';
  awardBadge('Planner');
};

document.querySelector('[data-bs-target="#summary"]').addEventListener('shown.bs.tab', ()=>{
  const sumHTML = `
    <h5>Risk Level:</h5><p>${document.getElementById('riskResult').innerText}</p>
    <h5>Preferences:</h5>${document.getElementById('dceResult').innerHTML}
    <h5>Recommendations:</h5>${document.getElementById('recommendations').innerHTML}
    <h5>Badges:</h5><p>${badges.join(', ')}</p>
    <h5>Reminders:</h5><ul>${reminders.map(r=>`<li>${new Date(r).toLocaleString()}</li>`).join('')}</ul>`;
  document.getElementById('summaryContent').innerHTML = sumHTML;
});

document.getElementById('generatePDF').onclick = ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.html(document.getElementById('summaryContent'), {
    callback: pdf => pdf.save('EyeMind_Summary.pdf'),
    x:10, y:10, width:180
  });
};
