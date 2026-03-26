// ============================================================
// NITW Smart Campus Portal — app.js
// Works on both localhost AND live Railway deployment
// ============================================================

// Auto-detect server URL — works locally AND when deployed
const SERVER = window.location.origin;

let userEmail = "";
let chartInstance = null;
let countdownInterval = null;
let currentTab = "login";

const DEFAULT_SUBJECTS = [
  "Mathematics", "Physics", "Data Structures",
  "Digital Electronics", "Programming Lab", "English"
];

// ===== PARTICLES =====
(function spawnParticles() {
  const c = document.getElementById("particles");
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.cssText = `left:${Math.random()*100}%;
      animation-duration:${6+Math.random()*14}s;
      animation-delay:${Math.random()*10}s;
      width:${1+Math.random()*3}px;height:${1+Math.random()*3}px;`;
    c.appendChild(p);
  }
})();

// ===== CLOCK =====
function updateClock() {
  const el = document.getElementById("liveTime");
  if (el) el.textContent = new Date().toLocaleTimeString("en-IN",
    {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
setInterval(updateClock, 1000); updateClock();

// ===== AUTH =====
function switchTab(tab) {
  currentTab = tab;
  document.getElementById("loginTab").classList.toggle("active", tab==="login");
  document.getElementById("registerTab").classList.toggle("active", tab==="register");
  document.getElementById("authBtnText").textContent = tab==="login" ? "Login" : "Register";
  document.getElementById("msg").textContent = "";
}

function togglePw() {
  const pw = document.getElementById("password");
  pw.type = pw.type==="password" ? "text" : "password";
}

async function doAuth() {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) { showMsg("Please fill in all fields", false); return; }
  if (!email.endsWith("@nitw.ac.in") && !email.endsWith("@student.nitw.ac.in")) {
    showMsg("Only NITW email allowed (@nitw.ac.in)", false); return;
  }

  try {
    const res  = await fetch(`${SERVER}/${currentTab}`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({email, password})
    });
    const text = await res.text();

    if (text==="Success")    { userEmail=email; launchDashboard(email); }
    else if (text==="Registered") { showMsg("Registered! Please login.", true); switchTab("login"); }
    else if (text==="User exists") { showMsg("Already registered. Please login.", false); }
    else { showMsg("Invalid email or password", false); }
  } catch {
    showMsg("⚠ Server not reachable. Run: node server.js", false);
  }
}

function showMsg(text, success) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "auth-msg" + (success?" success":"");
}

function launchDashboard(email) {
  document.getElementById("auth").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("userDisplay").textContent = email.split("@")[0];
  buildAttRows();
  buildBunkRows();
  buildSemPanels();
}

function logout() {
  userEmail = "";
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  document.getElementById("msg").textContent = "";
}

// ===== NAVIGATION =====
const sectionTitles = {
  home:"Dashboard", attendance:"Attendance Tracker — 6 Courses",
  bunk:"Bunk Calculator — 6 Courses", gpa:"CGPA Calculator — 8 Semesters",
  countdown:"Exam Countdown", campus:"Campus Info"
};

function showSection(name) {
  document.querySelectorAll(".section").forEach(s=>s.classList.add("hidden"));
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));
  document.getElementById(name).classList.remove("hidden");
  const navItems = document.querySelectorAll(".nav-item");
  ["home","attendance","bunk","gpa","countdown","campus"].forEach((s,i)=>{
    if (s===name && navItems[i+1]) navItems[i+1].classList.add("active");
  });
  document.getElementById("pageTitle").textContent = sectionTitles[name]||name;
}

// ============================================================
// ATTENDANCE — 6 COURSES
// ============================================================
function buildAttRows() {
  const container = document.getElementById("attRows");
  container.innerHTML = "";
  for (let i = 1; i <= 6; i++) {
    const row = document.createElement("div");
    row.className = "att-row";
    row.id = `attRow${i}`;
    row.innerHTML = `
      <div class="row-num">${i}</div>
      <input type="text"   id="attSubject${i}"  placeholder="${DEFAULT_SUBJECTS[i-1]}" />
      <input type="number" id="attAttended${i}" placeholder="0" min="0"/>
      <input type="number" id="attTotal${i}"    placeholder="0" min="0"/>
      <div class="att-status" id="attStatus${i}">—</div>
    `;
    container.appendChild(row);
    ["attAttended","attTotal"].forEach(prefix=>{
      document.getElementById(`${prefix}${i}`).addEventListener("input",()=>updateAttStatus(i));
    });
  }
}

function updateAttStatus(i) {
  const a = parseFloat(document.getElementById(`attAttended${i}`).value)||0;
  const t = parseFloat(document.getElementById(`attTotal${i}`).value)||0;
  const el = document.getElementById(`attStatus${i}`);
  if (!t) { el.textContent="—"; el.className="att-status"; return; }
  const pct = (a/t)*100;
  if (pct >= 85)      { el.textContent=`✅ ${pct.toFixed(1)}%`; el.className="att-status status-safe"; }
  else if (pct >= 75) { el.textContent=`⚠️ ${pct.toFixed(1)}%`; el.className="att-status status-warning"; }
  else                { el.textContent=`🚨 ${pct.toFixed(1)}%`; el.className="att-status status-danger"; }
}

async function saveAttendance() {
  const labels=[], attended=[], missed=[], results=[];
  let totalAtt=0, totalCls=0, anyInvalid=false;

  for (let i=1; i<=6; i++) {
    const subj = document.getElementById(`attSubject${i}`).value || DEFAULT_SUBJECTS[i-1];
    const a    = parseInt(document.getElementById(`attAttended${i}`).value);
    const t    = parseInt(document.getElementById(`attTotal${i}`).value);
    if (isNaN(a)||isNaN(t)||t<=0||a>t) { anyInvalid=true; continue; }
    const pct  = (a/t)*100;
    labels.push(subj); attended.push(a); missed.push(t-a);
    totalAtt+=a; totalCls+=t;
    let icon="✅",cls="status-safe";
    if (pct<75){icon="🚨";cls="status-danger";}
    else if(pct<85){icon="⚠️";cls="status-warning";}
    results.push(`<span class="${cls}">${icon} ${subj}: ${pct.toFixed(1)}% (${a}/${t})</span>`);
  }

  if (results.length===0) { alert("Fill in at least one subject properly"); return; }

  const avgPct = (totalAtt/totalCls)*100;
  const resultEl = document.getElementById("attResult");
  resultEl.className = `result-box ${avgPct>=75?"result-info":"result-danger"}`;
  resultEl.innerHTML = `
    <strong>Average Attendance: ${avgPct.toFixed(2)}%</strong>
    ${anyInvalid?'<br/><small style="color:var(--warning)">⚠ Some rows skipped (invalid data)</small>':""}<br/><br/>
    ${results.join("<br/>")}
  `;
  resultEl.classList.remove("hidden");
  document.getElementById("statAtt").textContent = avgPct.toFixed(1)+"%";

  const chartWrap = document.getElementById("chartWrap");
  chartWrap.classList.remove("hidden");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(document.getElementById("myChart"),{
    type:"bar",
    data:{
      labels,
      datasets:[
        {label:"Attended", data:attended, backgroundColor:"rgba(16,185,129,0.7)", borderColor:"#10b981", borderWidth:1},
        {label:"Missed",   data:missed,   backgroundColor:"rgba(239,68,68,0.5)",  borderColor:"#ef4444",  borderWidth:1}
      ]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ labels:{ color:"#e2e8f0", font:{family:"Exo 2"} } } },
      scales:{
        x:{ ticks:{color:"#94a3b8"}, grid:{color:"rgba(255,255,255,0.05)"} },
        y:{ ticks:{color:"#94a3b8"}, grid:{color:"rgba(255,255,255,0.05)"} }
      }
    }
  });

  try {
    await fetch(`${SERVER}/attendance`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:userEmail, attended:totalAtt, total:totalCls})
    });
  } catch {}
}

// ============================================================
// BUNK CALCULATOR — 6 COURSES
// ============================================================
function buildBunkRows() {
  const container = document.getElementById("bunkRows");
  container.innerHTML = "";
  for (let i=1; i<=6; i++) {
    const row = document.createElement("div");
    row.className = "bunk-row";
    row.id = `bunkRow${i}`;
    row.innerHTML = `
      <div class="row-num">${i}</div>
      <input type="text"   id="bunkSubject${i}"   placeholder="${DEFAULT_SUBJECTS[i-1]}"/>
      <input type="number" id="bunkAttended${i}"  placeholder="0" min="0"/>
      <input type="number" id="bunkTotal${i}"     placeholder="0" min="0"/>
      <input type="number" id="bunkRemaining${i}" placeholder="0" min="0"/>
      <div class="bunk-count" id="bunkCount${i}" style="color:var(--text-muted)">—</div>
    `;
    container.appendChild(row);
    ["bunkAttended","bunkTotal","bunkRemaining"].forEach(prefix=>{
      document.getElementById(`${prefix}${i}`).addEventListener("input",()=>updateBunkCount(i));
    });
  }
}

function updateBunkCount(i) {
  const a   = parseInt(document.getElementById(`bunkAttended${i}`).value)||0;
  const t   = parseInt(document.getElementById(`bunkTotal${i}`).value)||0;
  const rem = parseInt(document.getElementById(`bunkRemaining${i}`).value)||0;
  const el  = document.getElementById(`bunkCount${i}`);
  if (!t) { el.textContent="—"; el.style.color="var(--text-muted)"; return; }
  const minReq  = Math.ceil(0.75*(t+rem));
  const canBunk = Math.max(0, (a+rem)-minReq);
  el.textContent = canBunk;
  el.style.color = canBunk>0 ? "var(--success)" : "var(--danger)";
}

function calcBunk() {
  let summary=[], totalBunk=0;
  for (let i=1; i<=6; i++) {
    const subj = document.getElementById(`bunkSubject${i}`).value || DEFAULT_SUBJECTS[i-1];
    const a    = parseInt(document.getElementById(`bunkAttended${i}`).value);
    const t    = parseInt(document.getElementById(`bunkTotal${i}`).value);
    const rem  = parseInt(document.getElementById(`bunkRemaining${i}`).value)||0;
    if (isNaN(a)||isNaN(t)||t<=0) continue;
    const minReq  = Math.ceil(0.75*(t+rem));
    const canBunk = Math.max(0,(a+rem)-minReq);
    totalBunk += canBunk;
    const pct = ((a/t)*100).toFixed(1);
    const cls = canBunk>0?"status-safe":"status-danger";
    summary.push(`<span class="${cls}">${subj}: can bunk <strong>${canBunk}</strong> (now ${pct}%)</span>`);
  }
  if (!summary.length) { alert("Fill in at least one subject"); return; }
  const resultEl = document.getElementById("bunkResult");
  resultEl.className="result-box result-info";
  resultEl.innerHTML=`😴 <strong>Total safe bunks: ${totalBunk}</strong><br/><br/>${summary.join("<br/>")}`;
  resultEl.classList.remove("hidden");
  document.getElementById("statBunk").textContent = totalBunk;
}

// ============================================================
// CGPA CALCULATOR — 8 SEMESTERS
// ============================================================
const semData = {};
for (let s=1; s<=8; s++) semData[s]=[];

function buildSemPanels() {
  const container = document.getElementById("semPanels");
  container.innerHTML="";
  for (let year=1; year<=4; year++) {
    const panel = document.createElement("div");
    panel.className = `sem-panel${year===1?" active":""}`;
    panel.id = `yearPanel${year}`;
    const s1=year*2-1, s2=year*2;
    panel.innerHTML=`
      ${buildSemGroup(s1)}
      ${buildSemGroup(s2)}
      <div class="year-cgpa-display" id="yearCGPA${year}">Year ${year} CGPA: —</div>
    `;
    container.appendChild(panel);
  }
  for (let s=1; s<=8; s++) {
    semData[s]=[];
    for (let j=0; j<5; j++) semData[s].push({name:"",credit:"",grade:""});
    renderSemRows(s);
  }
}

function buildSemGroup(s) {
  return `
    <div class="sem-group" id="semGroup${s}">
      <div class="sem-title">Semester ${s}</div>
      <div class="sem-header"><span>Subject Name</span><span>Credits</span><span>Grade /10</span></div>
      <div id="semRows${s}"></div>
      <div style="margin-top:6px">
        <button class="add-sub-btn" onclick="addSemRow(${s})">＋ Add Subject</button>
        <button class="rem-sub-btn" onclick="removeSemRow(${s})">－ Remove</button>
      </div>
      <div class="sgpa-display" id="sgpa${s}">SGPA: —</div>
    </div>
  `;
}

function renderSemRows(s) {
  const container = document.getElementById(`semRows${s}`);
  container.innerHTML="";
  semData[s].forEach((sub,idx)=>{
    const row=document.createElement("div");
    row.className="sem-row";
    row.innerHTML=`
      <input type="text"   id="sn_${s}_${idx}" placeholder="Subject ${idx+1}" value="${sub.name}"   oninput="saveSemInput(${s},${idx},'name',this.value)"/>
      <input type="number" id="sc_${s}_${idx}" placeholder="3" min="1" max="6" value="${sub.credit}" oninput="saveSemInput(${s},${idx},'credit',this.value)"/>
      <input type="number" id="sg_${s}_${idx}" placeholder="8.5" min="0" max="10" step="0.5" value="${sub.grade}" oninput="saveSemInput(${s},${idx},'grade',this.value);liveCalcSGPA(${s})"/>
    `;
    container.appendChild(row);
  });
}

function saveSemInput(s,idx,field,val) { semData[s][idx][field]=val; }

function addSemRow(s) {
  semData[s].push({name:"",credit:"",grade:""});
  renderSemRows(s);
}

function removeSemRow(s) {
  if (semData[s].length>1) { semData[s].pop(); renderSemRows(s); }
}

function liveCalcSGPA(s) {
  let wp=0,tc=0;
  semData[s].forEach((_,idx)=>{
    const c=parseFloat(document.getElementById(`sc_${s}_${idx}`)?.value)||0;
    const g=parseFloat(document.getElementById(`sg_${s}_${idx}`)?.value)||0;
    if(c>0&&g>=0){wp+=c*g;tc+=c;}
  });
  const sgpa=tc>0?(wp/tc):0;
  document.getElementById(`sgpa${s}`).textContent=tc>0?`SGPA: ${sgpa.toFixed(2)}`:"SGPA: —";
  return {sgpa,tc};
}

function switchYear(year) {
  document.querySelectorAll(".sem-panel").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".year-tab").forEach(b=>b.classList.remove("active"));
  document.getElementById(`yearPanel${year}`).classList.add("active");
  document.querySelectorAll(".year-tab")[year-1].classList.add("active");
}

async function calcCGPA() {
  let grandWeighted=0, grandCredits=0;
  const semSummary=[], yearSummary=[];

  for (let year=1; year<=4; year++) {
    let yearWeighted=0, yearCredits=0;
    for (let sem=year*2-1; sem<=year*2; sem++) {
      semData[sem].forEach((_,idx)=>{
        const n=document.getElementById(`sn_${sem}_${idx}`)?.value||"";
        const c=parseFloat(document.getElementById(`sc_${sem}_${idx}`)?.value)||0;
        const g=parseFloat(document.getElementById(`sg_${sem}_${idx}`)?.value)||0;
        semData[sem][idx]={name:n,credit:c,grade:g};
      });
      let wp=0,tc=0;
      semData[sem].forEach(sub=>{
        if(sub.credit>0&&sub.grade>=0&&sub.grade<=10){
          wp+=sub.credit*sub.grade; tc+=sub.credit;
        }
      });
      const sgpa=tc>0?wp/tc:0;
      document.getElementById(`sgpa${sem}`).textContent=tc>0?`SGPA: ${sgpa.toFixed(2)}`:"SGPA: —";
      if(tc>0){
        semSummary.push({sem,sgpa,credits:tc});
        yearWeighted+=tc*sgpa; yearCredits+=tc;
        grandWeighted+=tc*sgpa; grandCredits+=tc;
      }
    }
    const yCGPA=yearCredits>0?yearWeighted/yearCredits:0;
    document.getElementById(`yearCGPA${year}`).textContent=
      yearCredits>0?`Year ${year} CGPA: ${yCGPA.toFixed(2)} (${yearCredits} credits)`:`Year ${year} CGPA: — (no data)`;
    if(yearCredits>0) yearSummary.push({year,cgpa:yCGPA,credits:yearCredits});
  }

  if (grandCredits===0) { alert("Enter grades for at least one semester"); return; }

  const overallCGPA = grandWeighted/grandCredits;
  let cls="result-safe", label="Excellent 🌟";
  if(overallCGPA<5){cls="result-danger";label="Needs Improvement ⚠️";}
  else if(overallCGPA<6){cls="result-warning";label="Average 📈";}
  else if(overallCGPA<7.5){cls="result-info";label="Good 👍";}
  else if(overallCGPA<9){cls="result-safe";label="Very Good ✅";}

  const semRows=semSummary.map(x=>
    `<tr><td>Sem ${x.sem}</td><td>${x.credits}</td><td>${x.sgpa.toFixed(2)}</td></tr>`).join("");
  const yearRows=yearSummary.map(x=>
    `<tr><td><strong>Year ${x.year}</strong></td><td>${x.credits}</td><td><strong>${x.cgpa.toFixed(2)}</strong></td></tr>`).join("");

  const resultEl=document.getElementById("gpaResult");
  resultEl.className=`result-box ${cls}`;
  resultEl.innerHTML=`
    🎯 <strong>Overall CGPA: ${overallCGPA.toFixed(2)} / 10</strong> — ${label}<br/>
    <small>Grand Total Credits: ${grandCredits}</small>
    <table class="gpa-table">
      <thead><tr><th>Period</th><th>Credits</th><th>SGPA / CGPA</th></tr></thead>
      <tbody>
        ${semRows}
        <tr style="border-top:1px solid var(--border);height:6px"><td colspan="3"></td></tr>
        ${yearRows}
      </tbody>
    </table>
  `;
  resultEl.classList.remove("hidden");
  document.getElementById("statGPA").textContent=overallCGPA.toFixed(2);

  try {
    await fetch(`${SERVER}/gpa`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:userEmail, cgpa:overallCGPA})
    });
  } catch {}
}

// ============================================================
// EXAM COUNTDOWN
// ============================================================
function startCountdown() {
  const dateVal=document.getElementById("examDate").value;
  const name=document.getElementById("examName").value||"Upcoming Exam";
  if (!dateVal){alert("Select exam date");return;}
  const target=new Date(dateVal); target.setHours(9,0,0,0);
  if (target<=new Date()){alert("Select a future date");return;}
  if (countdownInterval) clearInterval(countdownInterval);
  function tick() {
    const diff=target-new Date();
    if(diff<=0){
      clearInterval(countdownInterval);
      document.getElementById("countdownDisplay").innerHTML=
        `<div class="result-box result-danger">📝 Exam time! Good luck — ${name}!</div>`;
      return;
    }
    const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),
          m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    document.getElementById("countdownDisplay").innerHTML=`
      <div class="cd-exam-name">📝 ${name}</div>
      <div class="cd-boxes">
        ${[["Days",d],["Hours",h],["Mins",m],["Secs",s]].map(([l,v])=>`
          <div class="cd-box">
            <div class="cd-num">${String(v).padStart(2,"0")}</div>
            <div class="cd-label">${l}</div>
          </div>`).join("")}
      </div>`;
    document.getElementById("statDays").textContent=d;
  }
  tick(); countdownInterval=setInterval(tick,1000);
}