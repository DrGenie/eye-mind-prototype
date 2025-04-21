document.addEventListener('DOMContentLoaded', () => {
  // === GLOBAL STATE ===
  let riskProb = 0, riskLevel = '';
  let gazeData = [], calibrated = [false, false, false, false];
  let slideIndex = 0, dceResponses = [];
  const tasks = [
    { A:{type:'Counselling', method:'Hybrid', freq:'Weekly', duration:'2h', access:'Wider', cost:5},
      B:{type:'VR',          method:'Virtual',freq:'Monthly',duration:'4h', access:'Home',  cost:20} },
    { A:{type:'Peer support',method:'Virtual',freq:'Weekly',duration:'2h', access:'Home',  cost:50},
      B:{type:'Counselling', method:'Hybrid', freq:'Daily', duration:'30m',access:'Local', cost:20} },
    { A:{type:'Counselling',method:'Hybrid', freq:'Weekly', duration:'2h', access:'Local', cost:20},
      B:{type:'Community',   method:'In-person',freq:'Monthly',duration:'30m',access:'Wider', cost:50} },
    { A:{type:'Community',  method:'In-person',freq:'Weekly', duration:'4h', access:'Home',  cost:20},
      B:{type:'VR',         method:'Hybrid',   freq:'Daily',  duration:'30m',access:'Local', cost:20} },
    { A:{type:'Community',  method:'Hybrid',   freq:'Monthly',duration:'4h', access:'Wider', cost:5},
      B:{type:'Peer support',method:'In-person',freq:'Daily', duration:'2h', access:'Home',  cost:50} },
    { A:{type:'VR',         method:'In-person',freq:'Monthly',duration:'4h', access:'Wider', cost:20},
      B:{type:'Counselling',method:'In-person',freq:'Weekly', duration:'30m',access:'Local', cost:0} },
    { A:{type:'Community',  method:'In-person',freq:'Daily',  duration:'2h', access:'Home',  cost:20},
      B:{type:'Peer support',method:'Hybrid',  freq:'Weekly',duration:'4h', access:'Wider', cost:0} },
    { A:{type:'Community',  method:'In-person',freq:'Daily',  duration:'30m',access:'Wider', cost:5},
      B:{type:'VR',         method:'Hybrid',  freq:'Weekly',duration:'4h', access:'Home',  cost:50} },
    { A:{type:'Community',  method:'In-person',freq:'Daily',  duration:'30m',access:'Home',  cost:0},
      B:{type:'Counselling',method:'Hybrid',  freq:'Monthly',duration:'4h', access:'Wider', cost:50} }
  ];

  // Element refs
  const tabs      = document.querySelectorAll('#tabs .nav-link');
  const q1        = document.getElementById('q1');
  const q2        = document.getElementById('q2');
  const q3        = document.getElementById('q3');
  const riskForm  = document.getElementById('risk-form');
  const riskRes   = document.getElementById('risk-result');
  const startRead = document.getElementById('start-read');
  const prevSlide = document.getElementById('prev-slide');
  const nextSlide = document.getElementById('next-slide');
  const finishRead= document.getElementById('finish-read');
  const taskCont  = document.getElementById('task-container');
  const dceForm   = document.getElementById('dce-form');
  const recCont   = document.getElementById('rec-content');

  function activateTab(i){
    tabs[i].classList.remove('disabled');
    new bootstrap.Tab(tabs[i]).show();
  }

  // Simple “AI” risk predictor
  function aiRiskPredict(vals){
    const w=[0.3,0.5,0.7], b=-1;
    let z = b + w[0]*vals[0] + w[1]*vals[1] + w[2]*vals[2];
    return 1/(1+Math.exp(-z));
  }

  // === RISK HANDLER ===
  riskForm.onsubmit = e => {
    e.preventDefault();
    const vals = [+q1.value, +q2.value, +q3.value];
    riskProb = aiRiskPredict(vals);
    riskLevel = riskProb>0.7?'High':riskProb>0.4?'Moderate':'Low';
    riskRes.innerHTML = `<strong>Risk:</strong> ${riskLevel} (${(riskProb*100).toFixed(1)}%)`;
    activateTab(1);
  };

  // === GAZE SETUP ===
  webgazer.setRegression('ridge').setTracker('clmtrackr').begin();
  document.querySelectorAll('.cal-point').forEach((pt,i)=>{
    pt.onclick = () => {
      pt.style.background='green';
      calibrated[i]=true;
      if(calibrated.every(v=>v)) startRead.classList.remove('hidden');
    };
  });

  startRead.onclick = () => {
    gazeData = [];
    webgazer.setGazeListener((d,t)=>{ if(d) gazeData.push({x:d.x,y:d.y,t}); });
    document.getElementById('cal-area').classList.add('hidden');
    startRead.classList.add('hidden');
    showSlide();
  };

  function showSlide(){
    document.querySelectorAll('.slide').forEach((s,i)=>
      s.classList.toggle('hidden', i!==slideIndex)
    );
    document.getElementById('slide-content').classList.remove('hidden');
    document.getElementById('slide-controls').classList.remove('hidden');
    prevSlide.classList.toggle('hidden', slideIndex===0);
    nextSlide.classList.toggle('hidden',
      slideIndex===document.querySelectorAll('.slide').length-1
    );
    finishRead.classList.toggle('hidden',
      slideIndex!==document.querySelectorAll('.slide').length-1
    );
  }
  prevSlide.onclick = ()=>{ slideIndex--; showSlide(); };
  nextSlide.onclick = ()=>{ slideIndex++; showSlide(); };
  finishRead.onclick = () => {
    webgazer.pause();
    const total = gazeData.length;
    let fixCount = 0;
    gazeData.forEach((p,i,a)=>{
      const cluster = a.filter(x=>{
        return Math.hypot(x.x-p.x,x.y-p.y)<50;
      });
      if(cluster.length>5) fixCount++;
    });
    window.gazeStats = { total, fixations: fixCount };
    activateTab(2);
    buildDCE();
  };

  // === BUILD DCE ===
  function buildDCE(){
    tasks.forEach((t,i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mb-4';
      wrapper.innerHTML = `
        <h6>Task ${i+1}</h6>
        <table class="table table-sm table-bordered">
          <thead><tr><th>Feature</th><th>A</th><th>B</th></tr></thead>
          <tbody>
            <tr><td>Type</td><td>${t.A.type}</td><td>${t.B.type}</td></tr>
            <tr><td>Method</td><td>${t.A.method}</td><td>${t.B.method}</td></tr>
            <tr><td>Freq</td><td>${t.A.freq}</td><td>${t.B.freq}</td></tr>
            <tr><td>Dur</td><td>${t.A.duration}</td><td>${t.B.duration}</td></tr>
            <tr><td>Access</td><td>${t.A.access}</td><td>${t.B.access}</td></tr>
            <tr><td>Cost</td><td>${t.A.cost}</td><td>${t.B.cost}</td></tr>
          </tbody>
        </table>
        <div>
          <label class="me-3"><input type="radio" name="task${i}" value="A" required> A</label>
          <label class="me-3"><input type="radio" name="task${i}" value="B"> B</label>
          <label><input type="radio" name="task${i}" value="N"> Neither</label>
        </div>
      `;
      taskCont.appendChild(wrapper);
    });
    activateTab(2);
  }

  // === DCE SUBMIT & RECOMMEND ===
  dceForm.onsubmit = e => {
    e.preventDefault();
    dceResponses = tasks.map((t,i) => {
      const v = document.querySelector(`input[name="task${i}"]:checked`).value;
      return v==='A'?t.A : v==='B'?t.B : null;
    });
    activateTab(3);
    renderRecommendations();
  };

  function renderRecommendations(){
    const counts = { type:{}, method:{}, freq:{}, duration:{}, access:{}, cost:{} };
    dceResponses.forEach(r => {
      if(!r) return;
      ['type','method','freq','duration','access','cost'].forEach(k => {
        counts[k][r[k]] = (counts[k][r[k]]||0)+1;
      });
    });
    const prefs = {};
    Object.keys(counts).forEach(k => {
      const top = Object.entries(counts[k])
        .sort((a,b)=>b[1]-a[1])[0];
      prefs[k] = top ? top[0] : 'No pref';
    });
    recCont.innerHTML = `
      <p><strong>Risk:</strong> ${riskLevel}</p>
      <p><strong>Gaze fixations:</strong> ${window.gazeStats.fixations}  
      of ${window.gazeStats.total} points</p>
      <p><strong>Your prefs:</strong>
        Type=${prefs.type}, Method=${prefs.method},
        Freq=${prefs.freq}, Dur=${prefs.duration},
        Access=${prefs.access}, Cost=${prefs.cost}
      </p>
      <hr>
      <p><strong>We recommend:</strong> a
        <em>${prefs.type}</em> programme via
        <em>${prefs.method}</em>,
        <em>${prefs.freq}</em>,
        sessions of <em>${prefs.duration}</em> at
        <em>${prefs.access}</em>, costing
        <em>${prefs.cost}</em>.
      </p>
    `;
  }
});
