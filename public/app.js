
const OFFICIAL_GOV_PORTALS = {
  "Electrical Department": [
    ["MP Electricity Complaint (MPCZ – Bhopal/Central Zone)", "https://portal.mpcz.in"],
    ["MP CM Helpline", "https://www.cmhelpline.mp.gov.in/"],
    ["CPGRAMS – Government of India", "https://www.pgportal.gov.in/"]
  ],
  "Road Maintenance": [
    ["MP CM Helpline – Official Complaint", "https://www.cmhelpline.mp.gov.in/"],
    ["CPGRAMS – Government of India", "https://www.pgportal.gov.in/"]
  ],
  "Water Department": [
    ["MP CM Helpline – Official Complaint", "https://www.cmhelpline.mp.gov.in/"],
    ["CPGRAMS – Government of India", "https://www.pgportal.gov.in/"]
  ],
  "Sanitation Department": [
    ["MP CM Helpline – Official Complaint", "https://www.cmhelpline.mp.gov.in/"],
    ["CPGRAMS – Government of India", "https://www.pgportal.gov.in/"]
  ],
  "Transport Department": [
    ["MP CM Helpline – Official Complaint", "https://www.cmhelpline.mp.gov.in/"],
    ["CPGRAMS – Government of India", "https://www.pgportal.gov.in/"]
  ],
  "Emergency / Safety": [
    ["MP CM Helpline – Official Complaint", "https://www.cmhelpline.mp.gov.in/"],
    ["CPGRAMS – Government of India", "https://www.pgportal.gov.in/"]
  ],
  "General Support": [
    ["MP CM Helpline – Official Complaint", "https://www.cmhelpline.mp.gov.in/"],
    ["CPGRAMS – Government of India", "https://www.pgportal.gov.in/"]
  ]
};

function governmentPortalButtons(department) {
  const links = OFFICIAL_GOV_PORTALS[department] || OFFICIAL_GOV_PORTALS["General Support"];
  return `<div class="gov-inline"><b>🏛 Official Government Action:</b> ${
    links.map(([label,url]) => `<a class="gov-portal-btn" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join("")
  }<small class="muted gov-note">ResolveX opens the official portal; the final government complaint is submitted there by the citizen.</small></div>`;
}


function showOfficialGovernmentPortals(department, portals) {
  const box = document.getElementById('officialPortalBox');
  const links = document.getElementById('officialPortalLinks');
  if (!box || !links) return;
  const list = Array.isArray(portals) ? portals : [];
  links.innerHTML = list.map(p =>
    `<a class="gov-portal-btn" href="${p.url}" target="_blank" rel="noopener noreferrer">${p.label} ↗</a>`
  ).join('');
  box.classList.remove('hidden');
}


// Google OAuth callback: the backend redirects here after successful Citizen sign-in.
(function handleGoogleCallback() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('google_user');
  if (!encoded) return;
  try {
    const user = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
    localStorage.setItem('resolvex_user', JSON.stringify(user));
    window.history.replaceState({}, document.title, window.location.pathname);
    location.reload();
  } catch (e) {
    console.error('Google login callback error', e);
  }
})();

let TOKEN=localStorage.getItem("rx_token")||"";
let USER=JSON.parse(localStorage.getItem("rx_user")||"null");
let MAP=null;

const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function json(url,opt={}){
  opt.headers=opt.headers||{};
  if(TOKEN) opt.headers.Authorization="Bearer "+TOKEN;
  const r=await fetch(url,opt);
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"Request failed");
  return d;
}
function fillLogin(e,p){$("#loginEmail").value=e;$("#loginPassword").value=p}
function showApp(){
  $("#loginScreen").classList.add("hidden");
  $("#userBadge").textContent=`${USER.name} • ${USER.role}`;
  $("#roleInfo").textContent=`Logged in as ${USER.role}${USER.department?" • "+USER.department:""}`;
  $("#adminNav").style.display=USER.role==="Admin"?"inline":"none";
  if(USER.role!=="Admin") document.querySelector('[onclick="exportCsv()"]').disabled=true;
  refresh();
}
function logout(){localStorage.removeItem("rx_token");localStorage.removeItem("rx_user");location.reload()}
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#loginError").textContent="";
  try{const r=await json("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("#loginEmail").value,password:$("#loginPassword").value})});
    TOKEN=r.token;USER=r.user;localStorage.setItem("rx_token",TOKEN);localStorage.setItem("rx_user",JSON.stringify(USER));showApp();
  }catch(err){$("#loginError").textContent=err.message}
});

async function refresh(){
  if(!TOKEN)return;
  try{
    const [s,p,i,n,d]=await Promise.all([json("/api/stats"),loadProblems(true),json("/api/insights"),json("/api/notifications"),json("/api/departments/list")]);
    $("#total").textContent=s.total;$("#pending").textContent=s.pending;$("#resolved").textContent=s.resolved;$("#high").textContent=s.high;
    $("#overdue").textContent=s.overdue;$("#avgRating").textContent=s.avgRating;
    renderBars("#categories",s.byCategory);renderBars("#severity",s.bySeverity);renderBars("#departments",s.byDept);
    renderInsights(i);renderNotifications(n);populateDepartments(d);populateCategories(s.byCategory);renderMap(p);
    $("#lastUpdated").textContent="Updated "+new Date().toLocaleTimeString();
  }catch(e){if(e.message==="Login required"){logout()}}
}
async function loadProblems(returnData=false){
  const qs=new URLSearchParams();
  const map={q:"#search",category:"#fCategory",severity:"#fSeverity",status:"#fStatus",department:"#fDepartment"};
  for(const [k,s] of Object.entries(map)){const v=$(s)?.value;if(v)qs.set(k,v)}
  try{
    const p=await json("/api/problems?"+qs.toString());
    if(!returnData) renderList(p);
    return p;
  }catch(e){return []}
}
function renderBars(sel,obj){
  const el=$(sel),vals=Object.entries(obj||{}),max=Math.max(1,...vals.map(x=>x[1]));
  el.innerHTML=vals.length?vals.map(([k,v])=>`<div class="bar"><label><span>${esc(k)}</span><span>${v}</span></label><div class="barline"><i style="width:${v/max*100}%"></i></div></div>`).join(""):"<span class='muted'>No data yet</span>";
}
function renderInsights(x){
  $("#insights").innerHTML=`<p>${esc(x.summary)}</p>${x.actions.map(a=>`<div class="notice">• ${esc(a)}</div>`).join("")}`;
}
function renderNotifications(x){
  $("#notifications").innerHTML=x.length?x.map(n=>`<div class="notice"><b>${esc(n.title)}</b><br><span class="muted">${esc(n.text)}</span></div>`).join(""):"<span class='muted'>No active notifications.</span>";
}
function populateDepartments(ds){
  const opts=["All",...ds];
  const cur=$("#fDepartment").value;
  $("#fDepartment").innerHTML=opts.map(x=>`<option>${esc(x)}</option>`).join("");
  $("#fDepartment").value=opts.includes(cur)?cur:"All";
}
function populateCategories(obj){
  const opts=["All",...Object.keys(obj||{})];
  const cur=$("#fCategory").value;
  $("#fCategory").innerHTML=opts.map(x=>`<option>${esc(x)}</option>`).join("");
  $("#fCategory").value=opts.includes(cur)?cur:"All";
}
function canOfficer(p){
  return USER.role==="Admin" || (USER.role==="Department Officer" && (p.assignedDepartment||p.department)===USER.department);
}
function renderList(data){
  $("#list").innerHTML=data.length?data.map(p=>{
    const actions=canOfficer(p)?`
      ${p.status!=="In Progress"&&p.status!=="Resolved"?`<button class="ghost" onclick="updateStatus('${p.id}','In Progress')">Start Work</button>`:""}
      ${p.status!=="Resolved"?`<button class="ghost" onclick="updateStatus('${p.id}','Resolved')">Resolve</button>`:""}
      ${p.status==="Resolved"?`<button class="ghost" onclick="updateStatus('${p.id}','Reopened')">Reopen</button>`:""}
    `:"";
    const assign=USER.role==="Admin"?`<select onchange="assignDept('${p.id}',this.value)">${["Electrical Department","Road Maintenance","Water Department","Sanitation Department","Transport Department","Emergency / Safety","General Support"].map(d=>`<option ${d===(p.assignedDepartment||p.department)?"selected":""}>${esc(d)}</option>`).join("")}</select>`:`<span>${esc(p.assignedDepartment||p.department)}</span>`;
    return `<article class="item ${p.overdue?"overdue":""}">
      <div class="row"><div><strong>${esc(p.title)}</strong><div class="id">${esc(p.id)}</div></div><span class="pill">${esc(p.status)}</span></div>
      <p>${esc(p.description)}</p>
      <div class="meta">📍 ${esc(p.location)} · 🏷️ ${esc(p.category)} · 🚨 ${esc(p.severity)} · 🎯 ${p.confidence}% AI confidence · ⏱️ SLA ${p.slaHours}h ${p.overdue?"⚠ overdue":""}</div>
      <div class="meta">🏢 Department: ${assign} · Assignment: ${esc(p.assignmentMode||"AI Suggested")}</div>
      <div class="meta">🧠 Root cause: ${esc(p.rootCause)}<br>💡 Suggested action: ${esc(p.aiSolution)}</div>
      ${p.duplicateOf?`<div class="notice">🔍 Similar report: ${esc(p.duplicateOf)} (${p.duplicateSimilarity}% similarity)</div>`:""}
      ${p.image?`<img class="thumb" src="${esc(p.image)}" alt="Problem evidence">`:""}
      <details><summary>Timeline</summary><div class="timeline">${(p.timeline||[]).map(t=>`<div><b>${esc(t.status)}</b><span>${new Date(t.at).toLocaleString()} • ${esc(t.by||"System")}</span></div>`).join("")}</div></details>
      ${governmentPortalButtons(p.assignedDepartment||p.department)}
      <div class="actions">${actions}${p.status==="Resolved"&&USER.role==="Citizen"?`<button class="ghost" onclick="feedback('${p.id}')">Give Feedback</button>`:""}</div>
    </article>`
  }).join(""):"<p class='muted'>No problems match the selected filters.</p>";
}
async function updateStatus(id,s){try{const updated=await json("/api/problems/"+id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:s})});await refresh();alert("Status updated successfully: "+updated.status)}catch(e){alert(e.message)}}
async function assignDept(id,department){try{await json("/api/problems/"+id+"/department",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({department})});await refresh()}catch(e){alert(e.message)}}
async function feedback(id){
  const resolved=confirm("Was the problem actually resolved? OK = Yes, Cancel = No");
  const rating=resolved?Math.max(1,Math.min(5,Number(prompt("Rating 1-5","5")||5))):1;
  const comment=prompt("Comment","")||"";
  try{await json("/api/problems/"+id+"/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resolved,rating,comment})});await refresh()}catch(e){alert(e.message)}
}
$("#form").addEventListener("submit",async e=>{
 e.preventDefault();const out=$("#result");out.classList.remove("hidden");out.textContent="Analysing...";
 try{
  const r=await json("/api/problems",{method:"POST",body:new FormData(e.target)});
  out.innerHTML=`<b>🤖 AI Analysis Complete</b><br>
  Category: <strong>${esc(r.category)}</strong><br>Severity: <strong>${esc(r.severity)}</strong> • Priority ${r.priorityScore}/100<br>
  Department: <strong>${esc(r.assignedDepartment)}</strong><br>Confidence: <strong>${r.confidence}%</strong><br>
  Duplicate: <strong>${r.duplicateOf?`${esc(r.duplicateOf)} (${r.duplicateSimilarity}%)`:"No strong match"}</strong><br>
  Root cause: ${esc(r.rootCause)}<br>Suggested action: ${esc(r.aiSolution)}`;
  e.target.reset();$("#preview").innerHTML="";await refresh();
 }catch(err){out.innerHTML=`<span class="error">${esc(err.message)}</span>`}
});
$("#image").addEventListener("change",e=>{const f=e.target.files[0];if(f)$("#preview").innerHTML=`<img src="${URL.createObjectURL(f)}" alt="preview">`});
function demoVoice(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){alert("Voice recognition is not supported in this browser.");return}
 const r=new SR();r.lang="hi-IN";r.onresult=e=>{$("#desc").value=e.results[0][0].transcript};r.start();
}
function renderMap(problems){
 if(!window.L)return;
 if(!MAP){MAP=L.map("mapbox").setView([23.2599,77.4126],12);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors"}).addTo(MAP)}
 problems.slice(0,50).forEach((p,i)=>{
   const lat=p.latitude||23.25+(i%6)*0.006,lon=p.longitude||77.39+((i*7)%8)*0.006;
   L.marker([lat,lon]).addTo(MAP).bindPopup(`<b>${esc(p.id)}</b><br>${esc(p.title)}<br>${esc(p.category)} • ${esc(p.severity)}<br>${esc(p.status)}`);
 });
}
async function exportCsv(){
 if(USER.role!=="Admin"){alert("Admin role required.");return}
 const r=await fetch("/api/export.csv",{headers:{Authorization:"Bearer "+TOKEN}});
 const blob=await r.blob();const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="resolvex-report.csv";a.click();
}
["search","fCategory","fSeverity","fStatus","fDepartment"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>loadProblems()));
setInterval(()=>refresh(),15000);

if(TOKEN&&USER)showApp();
