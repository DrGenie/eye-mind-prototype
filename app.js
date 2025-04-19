// Global state
let riskLevel = '';
let score = 0;
let modePref = '', sizePref = '', freqPref = '';
let gazeData = [];
let engaged = false;

// --- User Login Logic ---
document.getElementById('loginBtn').onclick = () => {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const msg = document.getElementById('loginMsg');
  if (user === 'testuser' && pass === 'welcome123') {
    msg.innerText = 'Login successful!';
    msg.className = 'text-success';
    // enable tabs
    document.querySelectorAll('.nav-link.disabled').forEach(tab => tab.classList.remove('disabled'));
    // show AI tab
    setTimeout(() => {
      new bootstrap.Tab(document.querySelector('button[data-bs-target="#ai"]')).show();
    }, 500);
  } else {
    msg.innerText = 'Invalid credentials.';
    msg.className = 'text-danger';
  }
};

// --- AI Risk Profile Logic ---
document.getElementById('calcScoreBtn').onclick = () => {
  function getVal(name) {
    const r = document.querySelector(`input[name="${name}"]:checked`);
    return r ? parseInt(r.value) : 0;
  }
  score = getVal('q_leftout') + getVal('q_companionship');
  // categorize risk
  if (score <= 1) riskLevel = 'Low';
  else if (score <= 2) riskLevel = 'Moderate';
  else riskLevel = 'High';
  const res = document.getElementById('riskResult');
  res.innerHTML = `<strong>Loneliness Risk: ${riskLevel}</strong> (Score ${score}/4)`;
  res.className = riskLevel==='High'?'text-danger':'text-success';
};

// --- Gaze Tracking & Heatmap ---
const gazeArea = document.getElementById('gazeArea');
const gazeDot = document.getElementById('gazeDot');
gazeArea.onmousemove = ev => {
  engaged = true;
  gazeData.push({ x: ev.offsetX, y: ev.offsetY, value: 1 });
  gazeDot.style.display = 'block';
  gazeDot.style.left = ev.offsetX + 'px';
  gazeDot.style.top = ev.offsetY + 'px';
};
gazeArea.onmouseleave = () => gazeDot.style.display = 'none';

let heatmapVisible = false;
let heatmap;
document.getElementById('toggleHeatmap').onclick = function() {
  if (!heatmapVisible) {
    // init heatmap.js
    heatmap = h337.create({ container: gazeArea, radius: 40 });
    heatmap.setData({ max: 10, data: gazeData });
    this.innerText = 'Reset Tracking';
    gazeArea.onmousemove = null;
    heatmapVisible = true;
  } else {
    // reset
    gazeArea.innerHTML = `<img src="https://via.placeholder.com/600x300" alt="Content" class="w-100 h-100"/><div id="gazeDot" style="position:absolute;width:12px;height:12px;background:red;border-radius:50%;display:none;"></div>`;
    gazeDot = document.getElementById('gazeDot');
    gazeData = [];
    engaged = false;
    gazeArea.onmousemove = ev => {
      engaged = true;
      gazeData.push({ x: ev.offsetX, y: ev.offsetY, value: 1 });
      gazeDot.style.display = 'block';
      gazeDot.style.left = ev.offsetX + 'px';
      gazeDot.style.top = ev.offsetY + 'px';
    };
    this.innerText = 'Show Heatmap';
    heatmapVisible = false;
  }
};

// --- DCE Preferences ---
document.getElementById('submitDCE').onclick = () => {
  const c1 = document.querySelector('input[name="scenario1"]:checked')?.value;
  const c2 = document.querySelector('input[name="scenario2"]:checked')?.value;
  const c3 = document.querySelector('input[name="scenario3"]:checked')?.value;

  let virtual=0, inperson=0, grp=0, one=0, high=0, low=0;

  if(c1==='A'){ inperson++; low++; grp++; } else if(c1==='B'){ virtual++; high++; one++; }
  if(c2==='A'){ one++; high++; } else if(c2==='B'){ grp++; low++; }
  if(c3==='A'){ inperson++; low++; } else if(c3==='B'){ virtual++; high++; }

  modePref   = virtual>=inperson?'Virtual/Digital':'In-Person';
  sizePref   = one>=grp?'One-on-One':'Group';
  freqPref   = high>=low?'Frequent':'Less Frequent';

  const out = `
    <ul>
      <li><strong>Mode:</strong> ${modePref}</li>
      <li><strong>Setting:</strong> ${sizePref}</li>
      <li><strong>Frequency:</strong> ${freqPref}</li>
    </ul>`;
  document.getElementById('dceResult').innerHTML = out;
};

// --- Recommendations ---
function generateRecommendations() {
  const recs = [];
  if (riskLevel==='High') {
    if (modePref==='Virtual/Digital') recs.push('Join a daily online support group via video calls.');
    else recs.push('Attend a weekly local seniors meetup at your community centre.');
  }
  else if (riskLevel==='Moderate') {
    recs.push(`Schedule ${freqPref==='Frequent'?'daily':'weekly'} chats with a close friend.`);
  }
  else {
    recs.push('Continue your routine and consider mentoring peers to stay connected.');
  }
  recs.push(modePref==='Virtual/Digital'?
    'Explore a senior-friendly chat app to make new friends.':
    'Check your local noticeboard for upcoming in-person events.');
  if (!engaged) recs.push('Try a simple telephone buddy call for minimal tech use.');
  else recs.push('Consider an interactive online class to boost engagement.');

  return recs;
}

document.querySelector('button[data-bs-target="#recs"]').addEventListener('shown.bs.tab', () => {
  const list = generateRecommendations();
  let html = '<ol>';
  list.forEach(r=> html+=`<li>${r}</li>`);
  html += '</ol>';
  document.getElementById('recommendations').innerHTML = html;
});

// --- Summary Report ---
document.querySelector('button[data-bs-target="#summary"]').addEventListener('shown.bs.tab', () => {
  let summaryHtml = `
    <h5>Risk Level: ${riskLevel} (Score ${score}/4)</h5>
    <h5>Preferences:</h5>
    <ul>
      <li>Mode: ${modePref}</li>
      <li>Setting: ${sizePref}</li>
      <li>Frequency: ${freqPref}</li>
    </ul>
    <h5>Recommendations:</h5>`;
  const recs = generateRecommendations();
  summaryHtml += '<ol>';
  recs.forEach(r=> summaryHtml+=`<li>${r}</li>`);
  summaryHtml += '</ol>';
  document.getElementById('summaryContent').innerHTML = summaryHtml;
});
