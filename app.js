// Global state
let loggedIn = false;
let riskLevel = '', score = 0;
let gazeData = [], fixations = [];
let calibrationPoints = [
  {x: 20, y: 20}, {x: 580, y: 20},
  {x: 580, y: 280}, {x: 20, y: 280}
];
let calIndex = 0, calibrated = false;
let tracking = false, heatmapVisible = false, heatmap;
let scanCtx, scanCanvas;
let badgeCount = 0;

// --- Login ---
document.getElementById('loginBtn').onclick = () => {
  if (document.getElementById('username').value==='testuser' &&
      document.getElementById('password').value==='welcome123') {
    loggedIn = true;
    const msg = document.getElementById('loginMsg');
    msg.innerText = 'Welcome back!';
    msg.className = 'text-success';
    document.querySelectorAll('.nav-link.disabled')
      .forEach(t=>t.classList.remove('disabled'));
    setTimeout(()=>{
      new bootstrap.Tab(document.querySelector('[data-bs-target="#ai"]')).show();
    }, 500);
    // award badge: Social Starter
    awardBadge('Social Starter');
    incrementVisit();
  }
};

// --- AI Risk ---
document.getElementById('calcScoreBtn').onclick = () => {
  const v1 = +document.getElementById('q1').value;
  const v2 = +document.getElementById('q2').value;
  score = v1 + v2;
  riskLevel = score <= 1 ? 'Low' : score <= 2 ? 'Moderate' : 'High';
  const res = document.getElementById('riskResult');
  res.innerHTML = `<strong>${riskLevel}</strong> risk (Score ${score}/4)`;
  res.className = riskLevel==='High'?'text-danger':'text-success';
};

// --- Calibration ---
document.getElementById('startCal').onclick = () => {
  calIndex = 0;
  calibrated = false;
  document.getElementById('calMsg').innerText = 'Click each dot to calibrate.';
  const area = document.getElementById('calArea');
  area.innerHTML = '';
  calibrationPoints.forEach((pt,i)=>{
    const d = document.createElement('div');
    d.className = 'cal-dot';
    d.style.left = pt.x+'px'; d.style.top = pt.y+'px';
    d.onclick = () => {
      d.style.background='green';
      calIndex++;
      if (calIndex===calibrationPoints.length) {
        calibrated=true;
        document.getElementById('calMsg').innerText='Calibration complete!';
        document.getElementById('gazeControls').classList.remove('d-none');
      }
    };
    area.appendChild(d);
  });
};

// --- Gaze Tracking Setup ---
scanCanvas = document.getElementById('scanCanvas');
scanCtx = scanCanvas.getContext('2d');
// adjust canvas for high DPI
scanCanvas.width = scanCanvas.clientWidth;
scanCanvas.height = scanCanvas.clientHeight;

document.getElementById('startGaze').onclick = () => {
  if (!calibrated) return alert('Calibrate first.');
  tracking = true;
  document.getElementById('stopGaze').disabled = false;
  document.getElementById('startGaze').disabled = true;
  gazeArea.onmousemove = handleGaze;
  // reset data
  gazeData = []; fixations = [];
  scanCtx.clearRect(0,0,scanCanvas.width,scanCanvas.height);
  // start heatmap auto-update
  heatmap = h337.create({ container: gazeArea, radius: 30 });
  setInterval(()=> {
    if (heatmapVisible) heatmap.setData({ max:10, data:gazeData });
  }, 5000);
};

document.getElementById('stopGaze').onclick = () => {
  tracking = false;
  document.getElementById('stopGaze').disabled = true;
  document.getElementById('startGaze').disabled = false;
  gazeArea.onmousemove = null;
  updateGazeStats();
};

// Toggle Heatmap
document.getElementById('toggleHeatmap').onclick = function(){
  heatmapVisible = !heatmapVisible;
  this.innerText = heatmapVisible?'Reset Tracking':'Show Heatmap';
  if (!heatmapVisible) {
    gazeArea.innerHTML = gazeArea.innerHTML; // clear overlays
    heatmapVisible = false;
  }
};

// Handle Gaze Movement: record, draw scan path, detect fixations
const gazeArea = document.getElementById('gazeArea');
let lastPos = null, lastTime=0, fixStart=null;
function handleGaze(ev) {
  const x = ev.offsetX, y = ev.offsetY, t = Date.now();
  gazeData.push({ x, y, value:1 });
  // draw on scan canvas
  scanCtx.fillStyle = 'rgba(255,0,0,0.6)';
  scanCtx.beginPath();
  scanCtx.arc(x/600*scanCanvas.width, y/300*scanCanvas.height, 4,0,2*Math.PI);
  scanCtx.fill();
  // fixation detection
  if (lastPos && tracking) {
    const dx = x-lastPos.x, dy=y-lastPos.y;
    const dist = Math.hypot(dx,dy);
    if (dist<30) { // within 30px
      if (!fixStart) fixStart = { x:lastPos.x, y:lastPos.y, t:lastTime };
    } else {
      if (fixStart) {
        const dur = lastTime - fixStart.t;
        fixations.push({ x:fixStart.x, y:fixStart.y, dur });
        fixStart = null;
      }
    }
  }
  lastPos = { x,y }; lastTime = t;
}

// Update stats panel
function updateGazeStats(){
  if (fixStart) {
    const dur = Date.now() - fixStart.t;
    fixations.push({ x:fixStart.x, y:fixStart.y, dur });
    fixStart = null;
  }
  const count = fixations.length;
  const avgDur = count? (fixations.reduce((s,f)=>s+f.dur,0)/count).toFixed(0) : 0;
  // saccades: distances between fixations
  let sac=0;
  for(let i=1;i<fixations.length;i++){
    sac += Math.hypot(fixations[i].x-fixations[i-1].x, fixations[i].y-fixations[i-1].y);
  }
  const avgSac = fixations.length>1?(sac/(fixations.length-1)).toFixed(1):0;
  const stats = `
    <p><strong>Fixations:</strong> ${count}</p>
    <p><strong>Avg. duration:</strong> ${avgDur} ms</p>
    <p><strong>Avg. saccade:</strong> ${avgSac}px</p>
  `;
  document.getElementById('gazeStats').innerHTML = stats;
  // dynamic prompt
  if (avgDur<300) alert('You seemed to skim content quickly—consider using the audio reader!');
}

// --- DCE & Recommendations & Badges & Reminders ---
// (Omitted for brevity: use prior DCE and recommendation code)
// Insert your DCE logic here, then in Recommendation tab:
// award badges, set reminders, etc.

function awardBadge(name) {
  const container = document.getElementById('badges');
  const b = document.createElement('span');
  b.className='badge bg-success badge-box';
  b.innerText = name;
  container.appendChild(b);
}

// Track visits for badges
function incrementVisit(){
  let v = +localStorage.getItem('visits')||0;
  v++;
  localStorage.setItem('visits',v);
  if (v===3) awardBadge('Steady Stream');
}

// --- Audio Journalling (simplified) ---
let recorder, audioChunks=[];
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia({ audio:true })
    .then(stream=>{
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e=> audioChunks.push(e.data);
      recorder.onstop = ()=> {
        // simulate sentiment
        const sentiments = ['Positive','Neutral','Negative'];
        const s = sentiments[Math.floor(Math.random()*3)];
        alert('Sentiment: ' + s);
      };
    });
}
// You would add Start/Stop buttons and wire them to recorder.start/stop

// --- PDF Export ---
document.getElementById('generatePDF').onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(document.getElementById('summaryContent').innerText, 10, 10);
  doc.save('EyeMind_Summary.pdf');
};
