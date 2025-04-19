// Global state
let loggedIn = false;
let riskLevel = '', score = 0;
let modePref='', sizePref='', freqPref='';
let gazeData = [], fixations = [];
const calibrationPoints = [{x:20,y:20},{x:calcWidth()-40,y:20},{x:calcWidth()-40,y:280},{x:20,y:280}];
let calIndex = 0, calibrated = false;
let tracking = false, heatmapVisible = false, heatmap;
let badgeCount = 0;
let reminders = [];

// Utility to get calibrated area width
function calcWidth() {
  return document.getElementById('calArea').clientWidth;
}

// --- Login ---
document.getElementById('loginBtn').onclick = () => {
  if (document.getElementById('username').value==='testuser'
   && document.getElementById('password').value==='welcome123') {
    loggedIn = true;
    const msg = document.getElementById('loginMsg');
    msg.innerText = 'Login successful!';
    msg.className = 'text-success';
    document.querySelectorAll('.nav-link.disabled').forEach(t=>t.classList.remove('disabled'));
    setTimeout(()=> new bootstrap.Tab(document.querySelector('[data-bs-target="#ai"]')).show(), 500);
    awardBadge('Social Starter');
  } else {
    const msg = document.getElementById('loginMsg');
    msg.innerText = 'Invalid credentials.';
    msg.className = 'text-danger';
  }
};

// --- AI Risk Profile ---
document.getElementById('calcScoreBtn').onclick = () => {
  const v1 = +document.getElementById('q1').value;
  const v2 = +document.getElementById('q2').value;
  score = v1 + v2;
  riskLevel = score <= 1 ? 'Low' : score <= 2 ? 'Moderate' : 'High';
  const res = document.getElementById('riskResult');
  res.innerHTML = `<strong>${riskLevel}</strong> risk (Score ${score}/4)`;
  res.className = riskLevel==='High'?'text-danger fs-5':'text-success fs-5';
};

// --- Calibration & Gaze Tracking ---
const calArea = document.getElementById('calArea');
const calMsg = document.getElementById('calMsg');
const gazeControls = document.getElementById('gazeControls');
const scanCanvas = document.getElementById('scanCanvas');
const scanCtx = scanCanvas.getContext('2d');

// Resize canvas
function resizeScan() {
  scanCanvas.width = scanCanvas.clientWidth;
  scanCanvas.height = scanCanvas.clientHeight;
}
window.addEventListener('resize', resizeScan);
resizeScan();

document.getElementById('startCal').onclick = () => {
  calIndex = 0; calibrated=false;
  calArea.innerHTML='';
  calMsg.innerText='Click the 4 dots to calibrate.';
  calibrationPoints.forEach((pt,i)=>{
    const d = document.createElement('div');
    d.className='cal-dot';
    d.style.left = pt.x+'px'; d.style.top = pt.y+'px';
    d.onclick = ()=> {
      d.style.background='green';
      if (++calIndex===4) {
        calibrated=true;
        calMsg.innerText='Calibration complete!';
        gazeControls.classList.remove('d-none');
      }
    };
    calArea.appendChild(d);
  });
};

document.getElementById('startGaze').onclick = () => {
  if (!calibrated) return alert('Please calibrate first.');
  tracking=true;
  gazeControls.querySelector('#stopGaze').disabled=false;
  gazeControls.querySelector('#startGaze').disabled=true;
  calArea.onmousemove = handleGaze;
  gazeData=[]; fixations=[];
  scanCtx.clearRect(0,0,scanCanvas.width,scanCanvas.height);
  heatmap = h337.create({ container: calArea, radius: 30 });
};

document.getElementById('stopGaze').onclick = () => {
  tracking=false;
  gazeControls.querySelector('#stopGaze').disabled=true;
  gazeControls.querySelector('#startGaze').disabled=false;
  calArea.onmousemove=null;
  updateGazeStats();
};

document.getElementById('toggleHeatmap').onclick = function(){
  heatmapVisible = !heatmapVisible;
  this.innerText = heatmapVisible?'Reset Heatmap':'Show Heatmap';
  if (heatmapVisible) {
    heatmap.setData({ max:10, data:gazeData });
  } else {
    calArea.innerHTML=calArea.innerHTML; // clear overlays
  }
};

let lastPos=null, lastTime=0, fixStart=null;
function handleGaze(ev){
  const x=ev.offsetX, y=ev.offsetY, t=Date.now();
  gazeData.push({ x,y,value:1 });
  // draw scan
  scanCtx.fillStyle='rgba(255,0,0,0.6)';
  scanCtx.beginPath();
  scanCtx.arc(x/600*scanCanvas.width, y/300*scanCanvas.height, 4,0,2*Math.PI);
  scanCtx.fill();
  // fixation logic
  if (lastPos && tracking) {
    const dx=x-lastPos.x, dy=y-lastPos.y;
    if (Math.hypot(dx,dy)<30) {
      if (!fixStart) fixStart={x:lastPos.x,y:lastPos.y,t:lastTime};
    } else {
      if (fixStart) {
        fixations.push({ x:fixStart.x,y:fixStart.y,dur:lastTime-fixStart.t });
        fixStart=null;
      }
    }
  }
  lastPos={x,y}; lastTime=t;
}

function updateGazeStats(){
  if (fixStart) {
    fixations.push({ x:fixStart.x,y:fixStart.y,dur:Date.now()-fixStart.t });
    fixStart=null;
  }
  const count=fixations.length;
  const avgDur = count?(fixations.reduce((s,f)=>s+f.dur,0)/count).toFixed(0):0;
  let sac=0;
  for(let i=1;i<fixations.length;i++){
    sac+=Math.hypot(fixations[i].x-fixations[i-1].x, fixations[i].y-fixations[i-1].y);
  }
  const avgSac = fixations.length>1?(sac/(fixations.length-1)).toFixed(1):0;
  document.getElementById('gazeStats').innerHTML = `
    <p><strong>Fixations:</strong> ${count}</p>
    <p><strong>Avg duration:</strong> ${avgDur} ms</p>
    <p><strong>Avg saccade:</strong> ${avgSac}px</p>`;
}

// --- DCE Preferences ---
document.getElementById('submitDCE').onclick = ()=>{
  const c1 = document.querySelector('input[name="sc1"]:checked')?.value;
  const c2 = document.querySelector('input[name="sc2"]:checked')?.value;
  const c3 = document.querySelector('input[name="sc3"]:checked')?.value;
  let v=0,i=0,g=0,h=0,l=0;
  if(c1==='A'){ i++; l++; g++; } else if(c1==='B'){ v++; h++; }
  if(c2==='A'){ g++; h++; } else if(c2==='B'){ g++; l++; }
  if(c3==='A'){ i++; l++; } else if(c3==='B'){ v++; h++; }
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

// --- Recommendations, Audio, Reminders, Badges ---
function generateRecommendations(){
  const recs=[];
  if(riskLevel==='High'){
    recs.push(modePref==='Virtual'?
      'Join a daily online support group via video.':
      'Attend a weekly local seniors meetup.');
  } else if(riskLevel==='Moderate'){
    recs.push(`Schedule ${freqPref.toLowerCase()} chats with family or friends.`);
  } else {
    recs.push('Great work staying connected! Maybe mentor a peer.');
  }
  recs.push(modePref==='Virtual'?
    'Try a senior-friendly chat app.':
    'Check community centre events posted locally.');
  return recs;
}

document.querySelector('[data-bs-target="#recs"]').addEventListener('shown.bs.tab', ()=>{
  riskLevel = document.getElementById('riskResult').innerText.split(' ')[0];
  const recs = generateRecommendations();
  document.getElementById('recommendations').innerHTML = 
    '<ol>'+recs.map(r=>`<li>${r}</li>`).join('')+'</ol>';
});

// Badges
function awardBadge(name){
  const b=document.createElement('span');
  b.className='badge bg-success me-1';
  b.innerText=name;
  document.getElementById('badges').appendChild(b);
}

// Audio Journal
let recorder, audioChunks=[];
navigator.mediaDevices.getUserMedia({audio:true})
  .then(stream=>{
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e=> audioChunks.push(e.data);
    recorder.onstop = ()=>{
      // mock sentiment
      const s=['Positive','Neutral','Negative'][Math.floor(Math.random()*3)];
      document.getElementById('audioMsg').innerText = `Sentiment: ${s}`;
      awardBadge('Audio Express');
    };
  });

document.getElementById('startAudio').onclick = ()=>{
  audioChunks=[]; recorder.start();
  document.getElementById('startAudio').disabled=true;
  document.getElementById('stopAudio').disabled=false;
  document.getElementById('audioMsg').innerText='Recording...';
};
document.getElementById('stopAudio').onclick = ()=>{
  recorder.stop();
  document.getElementById('startAudio').disabled=false;
  document.getElementById('stopAudio').disabled=true;
};

// Reminders
document.getElementById('setReminder').onclick = ()=>{
  const dt = document.getElementById('reminderTime').value;
  if(!dt) return;
  reminders.push(dt);
  const li=document.createElement('li');
  li.className='list-group-item';
  li.innerText = new Date(dt).toLocaleString();
  document.getElementById('reminderList').appendChild(li);
  document.getElementById('reminderTime').value='';
  awardBadge('Planner');
};

// Summary & PDF
document.querySelector('[data-bs-target="#summary"]').addEventListener('shown.bs.tab', ()=>{
  const sum = `
    <h5>Risk Level:</h5><p>${document.getElementById('riskResult').innerText}</p>
    <h5>Preferences:</h5>${document.getElementById('dceResult').innerHTML}
    <h5>Recommendations:</h5>${document.getElementById('recommendations').innerHTML}
    <h5>Badges:</h5><p>${[...document.getElementById('badges').children].map(b=>b.innerText).join(', ')}</p>
    <h5>Reminders:</h5><ul>${reminders.map(r=>`<li>${new Date(r).toLocaleString()}</li>`).join('')}</ul>`;
  document.getElementById('summaryContent').innerHTML = sum;
});

document.getElementById('generatePDF').onclick = ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.html(document.getElementById('summaryContent'), {
    callback: pdf => pdf.save('EyeMind_Summary.pdf'),
    x:10, y:10, width: 180
  });
};
