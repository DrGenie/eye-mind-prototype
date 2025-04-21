document.addEventListener('DOMContentLoaded', () => {
  // Globals
  let riskProb=0, riskLevel='';
  let gazeData=[], calibrated=[false,false,false,false];
  let slideIndex=0, slideEnter=0, timeSpent=[0,0,0,0,0,0];
  let dceResponses=[];
  const tasks=[ /* same 9 tasks as before */ ];

  // Elements
  const tabs=document.querySelectorAll('#tabs .nav-link');
  const riskForm=document.getElementById('risk-form');
  const riskRes=document.getElementById('risk-result');
  const riskInfo=document.getElementById('risk-info');
  const startRead=document.getElementById('start-read');
  const prevSlide=document.getElementById('prev-slide');
  const nextSlide=document.getElementById('next-slide');
  const finishRead=document.getElementById('finish-read');
  const slideContent=document.getElementById('slide-content');
  const slideControls=document.getElementById('slide-controls');
  const gazeSummary=document.getElementById('gaze-summary');
  const topSlideEl=document.getElementById('top-slide');
  const slideMeaning=document.getElementById('slide-meaning');
  const taskContainer=document.getElementById('task-container');
  const dceForm=document.getElementById('dce-form');
  const recContent=document.getElementById('rec-content');

  // Activate tab i
  function activateTab(i){
    tabs[i].classList.remove('disabled');
    new bootstrap.Tab(tabs[i]).show();
  }

  // Simple AI risk predictor
  function aiRiskPredict(vals){
    const w=[0.3,0.5,0.7], b=-1;
    let z=b + w[0]*vals[0] + w[1]*vals[1] + w[2]*vals[2];
    return 1/(1+Math.exp(-z));
  }

  // RISK handler
  riskForm.onsubmit=e=>{
    e.preventDefault();
    const vals=[+q1.value,+q2.value,+q3.value];
    riskProb=aiRiskPredict(vals);
    riskLevel=riskProb>0.7?'High':riskProb>0.4?'Moderate':'Low';
    riskRes.innerHTML=`<strong>Risk:</strong> ${riskLevel} (${(riskProb*100).toFixed(1)}%)`;
    riskInfo.classList.remove('hidden');
    activateTab(1);
  };

  // GAZE setup
  webgazer.setRegression('ridge').setTracker('clmtrackr').begin();
  document.querySelectorAll('.cal-point').forEach((pt,i)=>{
    pt.onclick=()=>{
      calibrated[i]=true; pt.style.background='green';
      if(calibrated.every(v=>v)) startRead.classList.remove('hidden');
    };
  });

  startRead.onclick=()=>{
    gazeData=[]; slideEnter=Date.now();
    webgazer.setGazeListener((d,t)=>{ if(d) gazeData.push({x:d.x,y:d.y,t}); });
    document.getElementById('cal-area').classList.add('hidden');
    startRead.classList.add('hidden');
    showSlide();
  };

  function showSlide(){
    // record time spent on previous slide
    if(slideIndex>0 || slideEnter>0){
      timeSpent[slideIndex] += (Date.now()-slideEnter)/1000;
    }
    slideEnter=Date.now();
    document.querySelectorAll('.slide').forEach((s,i)=>
      s.classList.toggle('hidden',i!==slideIndex)
    );
    slideContent.classList.remove('hidden');
    slideControls.classList.remove('hidden');
    prevSlide.classList.toggle('hidden',slideIndex===0);
    nextSlide.classList.toggle('hidden',slideIndex===5);
    finishRead.classList.toggle('hidden',slideIndex!==5);
  }

  prevSlide.onclick=()=>{ slideIndex--; showSlide(); };
  nextSlide.onclick=()=>{ slideIndex++; showSlide(); };

  finishRead.onclick=()=>{
    // finalize time on last slide
    timeSpent[slideIndex] += (Date.now()-slideEnter)/1000;
    webgazer.pause();
    // find max slide
    const idx=timeSpent.indexOf(Math.max(...timeSpent));
    const labels=[
      'Type of support',
      'Interaction method',
      'Frequency',
      'Duration',
      'Accessibility',
      'Cost'
    ];
    topSlideEl.textContent=labels[idx];
    const meanings=[
      'you care about the kind of social activities',
      'you value how you connect (in‑person vs virtual)',
      'you prioritise how often programmes meet',
      'you focus on session length',
      'you consider travel convenience',
      'you are cost‑sensitive'
    ];
    slideMeaning.textContent=meanings[idx];
    gazeSummary.classList.remove('hidden');
    activateTab(2);
    buildDCE();
  };

  // Build DCE form
  function buildDCE(){
    tasks.forEach((t,i)=>{
      const div=document.createElement('div');
      div.className='mb-4';
      div.innerHTML=`
        <h6>Task ${i+1}</h6>
        <!-- table... same as before -->
        <div>
          <label class="me-3"><input required type="radio" name="task${i}" value="A"> A</label>
          <label class="me-3"><input type="radio" name="task${i}" value="B"> B</label>
          <label><input type="radio" name="task${i}" value="N"> Neither</label>
        </div>
      `;
      taskContainer.appendChild(div);
    });
  }

  dceForm.onsubmit=e=>{
    e.preventDefault();
    dceResponses=tasks.map((t,i)=>{
      const v=document.querySelector(`input[name="task${i}"]:checked`).value;
      return v==='A'?t.A:v==='B'?t.B:null;
    });
    activateTab(3);
    renderRecommendations();
  };

  // Render recommendations
  function renderRecommendations(){
    const counts={type:{},method:{},freq:{},duration:{},access:{},cost:{}};
    dceResponses.forEach(r=>{
      if(!r) return;
      ['type','method','freq','duration','access','cost'].forEach(k=>{
        counts[k][r[k]]=(counts[k][r[k]]||0)+1;
      });
    });
    const prefs={};
    Object.keys(counts).forEach(k=>{
      const [best]=Object.entries(counts[k]).sort((a,b)=>b[1]-a[1]);
      prefs[k]=best?best[0]:'No pref';
    });
    recContent.innerHTML=`
      <p><strong>Summary:</strong></p>
      <ul>
        <li>Risk level: ${riskLevel}</li>
        <li>Priority focus: <em>${topSlideEl.textContent}</em></li>
        <li>Your preferences: Type=${prefs.type}, Method=${prefs.method}, 
            Freq=${prefs.freq}, Dur=${prefs.duration}, 
            Access=${prefs.access}, Cost=${prefs.cost}</li>
      </ul>
      <hr>
      <p><strong>Recommendation:</strong> Join a 
         <em>${prefs.type}</em> programme via 
         <em>${prefs.method}</em>, 
         <em>${prefs.freq}</em> sessions of 
         <em>${prefs.duration}</em> at 
         <em>${prefs.access}</em>, costing 
         <em>${prefs.cost}</em>.
      </p>
    `;
  }

  // Enable tooltips
  var tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function(el){
    return new bootstrap.Tooltip(el);
  });
});
