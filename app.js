// Statee
let loggedIn = false, score = 0, riskLevel = '';
let modePref='', sizePref='', freqPref='';
let gazeData=[], fixations=[];
const calibrationPoints = [
  {x:'10%', y:'10%'},
  {x:'90%', y:'10%'},
  {x:'90%', y:'90%'},
  {x:'10%', y:'90%'}
];
let calIndex=0, calibrated=false, tracking=false, heatmapVisible=false, heatmap;
let reminders=[], badges=[];

// --- LOGIN ---
document.getElementById('loginBtn').onclick = () => {
  if (username.value==='testuser' && password.value==='welcome123') {
    loggedIn=true;
    loginMsg.innerText='Login successful!';
    loginMsg.className='text-success';
    document.querySelectorAll('.nav-link.disabled').forEach(t=>t.classList.remove('disabled'));
    setTimeout(()=> new bootstrap.Tab(document.querySelector('[data-bs-target="#ai"]')).show(), 300);
    awardBadge('Social Starter');
  } else {
    loginMsg.innerText='Invalid credentials.';
    loginMsg.className='text-danger';
  }
};

// --- AI RISK ---
calcScoreBtn.onclick = () => {
  score = +q1.value + +q2.value;
  riskLevel = score<=1?'Low':score<=2?'Moderate':'High';
  riskResult.innerHTML=`<strong>${riskLevel}</strong> risk (Score ${score}/4)`;
  riskResult.className = (riskLevel==='High'?'text-danger ':'text-success ')+'fs-5';
};

// --- CALIBRATION ---
startCal.onclick = () => {
  calIndex=0; calibrated=false;
  calMsg.innerText='Click each dot to calibrate.';
  calArea.innerHTML=`
    <img src="https://via.placeholder.com/600x300" alt="Content" class="w-100 h-100"/>
    <div id="heatmapContainer" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
    <div id="gazeDot" style="position:absolute;width:12px;height:12px;background:red;border-radius:50%;display:none;pointer-events:none;"></div>`;
  calibrationPoints.forEach((pt,i)=>{
    const d=document.createElement('div');
    d.className='cal-dot';
    d.style.left=pt.x; d.style.top=pt.y;
    d.onclick = () => {
      d.style.background='green';
      if (++calIndex===4){
        calibrated=true;
        calMsg.innerText='Calibration complete!';
        gazeControls.classList.remove('d-none');
      }
    };
    calArea.appendChild(d);
  });
};

// --- GAZE TRACKING ---
const scanCanvas = document.getElementById('scanCanvas');
const scanCtx = scanCanvas.getContext('2d');
function resizeCanvas(){
  scanCanvas.width=scanCanvas.clientWidth;
  scanCanvas.height=scanCanvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

startGaze.onclick = () => {
  if (!calibrated) return alert('Please calibrate first.');
  tracking=true;
  stopGaze.disabled=false; startGaze.disabled=true;
  calArea.onmousemove=handleGaze;
  gazeData=[]; fixations=[];
  scanCtx.clearRect(0,0,scanCanvas.width,scanCanvas.height);
  heatmap = h337.create({ container:heatmapContainer, radius:30 });
};

stopGaze.onclick = () => {
  tracking=false;
  stopGaze.disabled=true; startGaze.disabled=false;
  calArea.onmousemove=null;
  updateGazeStats();
};

toggleHeatmap.onclick = function(){
  heatmapVisible = !heatmapVisible;
  this.innerText = heatmapVisible?'Reset Heatmap':'Show Heatmap';
  if (heatmapVisible) {
    heatmap.setData({ max:10, data:gazeData });
  } else {
    heatmapContainer.innerHTML='';
  }
};

let lastPos=null, lastTime=0, fixStart=null;
function handleGaze(e){
  const x=e.offsetX, y=e.offsetY, t=Date.now();
  gazeData.push({ x,y,value:1 });
  scanCtx.fillStyle='rgba(255,0,0,0.6)';
  scanCtx.beginPath();
  scanCtx.arc(x/600*scanCanvas.width, y/300*scanCanvas.height, 4,0,2*Math.PI);
  scanCtx.fill();
  if (lastPos && tracking){
    if (Math.hypot(x-lastPos.x,y-lastPos.y)<30){
      if (!fixStart) fixStart={x:lastPos.x,y:lastPos.y,t:lastTime};
    } else {
      if (fixStart){
        fixations.push({ x:fixStart.x,y:fixStart.y,dur:lastTime-fixStart.t });
        fixStart=null;
      }
    }
  }
  gazeDot.style.display='block';
  gazeDot.style.left=`${x}px`;
  gazeDot.style.top=`${y}px`;
  lastPos={x,y}; lastTime=t;
}

function updateGazeStats(){
  if (fixStart){
    fixations.push({ x:fixStart.x,y:fixStart.y,dur:Date.now()-fixStart.t });
    fixStart=null;
  }
  const c=fixations.length;
  const avgDur = c?(fixations.reduce((s,f)=>s+f.dur,0)/c).toFixed(0):0;
  let sac=0;
  for(let i=1;i<fixations.length;i++){
    sac+=Math.hypot(fixations[i].x-fixations[i-1].x,fixations[i].y-fixations[i-1].y);
  }
  const avgSac = fixations.length>1?(sac/(fixations.length-1)).toFixed(1):0;
  gazeStats.innerHTML=`
    <p><strong>Fixations:</strong> ${c}</p>
    <p><strong>Avg duration:</strong> ${avgDur} ms</p>
    <p><strong>Avg saccade:</strong> ${avgSac}px</p>`;
}

// --- DCE ---
submitDCE.onclick = ()=>{
  const c1 = document.querySelector('input[name="sc1"]:checked')?.value;
  const c2 = document.querySelector('input[name="sc2"]:checked')?.value;
  const c3 = document.querySelector('input[name="sc3"]:checked')?.value;
  let v=0,i=0,g=0,h=0,l=0;
  if(c1==='A'){ i++;l++;g++; } else if(c1==='B'){ v++;h++; }
  if(c2==='A'){ g++;h++; } else if(c2==='B'){ g++;l++; }
  if(c3==='A'){ i++;l++; } else if(c3==='B'){ v++;h++; }
  modePref=v>=i?'Virtual':'In-Person';
  sizePref=g>=1?'Group':'One-on-One';
  freqPref=h>=l?'Frequent':'Less Frequent';
  dceResult.innerHTML=`
    <ul>
      <li><strong>Mode:</strong> ${modePref}</li>
      <li><strong>Setting:</strong> ${sizePref}</li>
      <li><strong>Frequency:</strong> ${freqPref}</li>
    </ul>`;
};

// --- RECOMMENDATIONS ---
document.querySelector('[data-bs-target="#recs"]').addEventListener('shown.bs.tab', ()=>{
  riskLevel = riskResult.innerText.split(' ')[0];
  const recs=[];
  if(riskLevel==='High'){
    recs.push(modePref==='Virtual'?
      'Join a daily online support group.':
      'Attend a weekly community meetup.');
  } else if(riskLevel==='Moderate'){
    recs.push(`Schedule ${freqPref.toLowerCase()} chats with friends.`);
  } else {
    recs.push('Great job staying connected! Consider mentoring others.');
  }
  recs.push(modePref==='Virtual'?
    'Try a senior-friendly chat app.':
    'Visit your local centre for in-person events.');
  recommendations.innerHTML='<ol>'+recs.map(r=>`<li>${r}</li>`).join('')+'</ol>';
});

// --- BADGES ---
function awardBadge(name){
  if (badges.includes(name)) return;
  badges.push(name);
  const b=document.createElement('span');
  b.className='badge bg-success me-1';
  b.innerText=name;
  document.getElementById('badges').appendChild(b);
}

// --- AUDIO JOURNAL ---
let recorder,audioChunks=[];
navigator.mediaDevices.getUserMedia({audio:true})
  .then(stream=>{
    recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>audioChunks.push(e.data);
    recorder.onstop=()=>{
      const blob=new Blob(audioChunks,{type:'audio/webm'});
      const url=URL.createObjectURL(blob);
      audioMsg.innerHTML=`<p>Sentiment: ${['Positive','Neutral','Negative'][Math.floor(Math.random()*3)]}</p>
        <audio controls src="${url}"></audio>`;
      awardBadge('Audio Express');
    };
  });

startAudio.onclick=()=>{
  audioChunks=[]; recorder.start();
  startAudio.disabled=true; stopAudio.disabled=false;
  audioMsg.innerText='Recording...';
};
stopAudio.onclick=()=>{
  recorder.stop();
  startAudio.disabled=false; stopAudio.disabled=true;
};

// --- REMINDERS ---
setReminder.onclick=()=>{
  const dt=reminderTime.value;
  if(!dt) return;
  reminders.push(dt);
  const li=document.createElement('li');
  li.className='list-group-item';
  li.innerText=new Date(dt).toLocaleString();
  reminderList.appendChild(li);
  reminderTime.value='';
  awardBadge('Planner');
};

// --- SUMMARY & PDF ---
document.querySelector('[data-bs-target="#summary"]').addEventListener('shown.bs.tab', ()=>{
  const sumHTML=`
    <h5>Risk Level:</h5><p>${riskResult.innerText}</p>
    <h5>Preferences:</h5>${dceResult.innerHTML}
    <h5>Recommendations:</h5>${recommendations.innerHTML}
    <h5>Badges:</h5><p>${badges.join(', ')}</p>
    <h5>Reminders:</h5><ul>${reminders.map(r=>`<li>${new Date(r).toLocaleString()}</li>`).join('')}</ul>`;
  summaryContent.innerHTML=sumHTML;
});

generatePDF.onclick=()=>{
  const { jsPDF } = window.jspdf;
  const doc=new jsPDF();
  doc.text(summaryContent.innerText.split('\n'),10,10);
  doc.save('EyeMind_Summary.pdf');
};
