const express=require("express");
const cors=require("cors");
const multer=require("multer");
const path=require("path");
const fs=require("fs");
const crypto=require("crypto");
require("dotenv").config();

const app=express();
const PORT=process.env.PORT||3000;
const DATA=path.join(__dirname,"data");
const UP=path.join(__dirname,"uploads");
const DB=path.join(DATA,"problems.json");
fs.mkdirSync(DATA,{recursive:true});
fs.mkdirSync(UP,{recursive:true});
if(!fs.existsSync(DB)) fs.writeFileSync(DB,"[]");

const upload=multer({dest:UP});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));
app.use("/uploads",express.static(UP));

const read=()=>JSON.parse(fs.readFileSync(DB,"utf8"));
const write=x=>fs.writeFileSync(DB,JSON.stringify(x,null,2));

const USERS=[
  {id:"u1",name:"Demo Citizen",email:"citizen@resolvex.demo",password:"citizen123",role:"Citizen"},
  {id:"u2",name:"System Admin",email:"admin@resolvex.demo",password:"admin123",role:"Admin"},
  {id:"u3",name:"Electrical Officer",email:"officer@resolvex.demo",password:"officer123",role:"Department Officer",department:"Electrical Department"}
];
const DEPARTMENTS=[
  "Electrical Department","Road Maintenance","Water Department",
  "Sanitation Department","Transport Department","Emergency / Safety","General Support"
];

function tokenFor(user){
  return Buffer.from(JSON.stringify({id:user.id,role:user.role,name:user.name,department:user.department||null})).toString("base64url");
}
function userFromReq(req){
  const h=req.headers.authorization||"";
  if(!h.startsWith("Bearer ")) return null;
  try{return JSON.parse(Buffer.from(h.slice(7),"base64url").toString("utf8"))}catch{return null}
}
function requireRole(...roles){
  return (req,res,next)=>{
    const u=userFromReq(req);
    if(!u) return res.status(401).json({error:"Login required"});
    if(roles.length && !roles.includes(u.role)) return res.status(403).json({error:"Role not permitted"});
    req.user=u; next();
  };
}

function analyse(text="",image=false){
  const raw=String(text||"").toLowerCase();
  const t=raw.normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
  const has=(...terms)=>terms.some(x=>t.includes(x));
  let category="General",department="General Support",severity="LOW",score=25,confidence=78;
  let solution="Review the report and assign it to the appropriate team.",matched="general";

  if(has("gas leak","gas leakage","fire","smoke","live wire","electric shock","आग","धुआं","गैस लीक","गैस रिसाव","करंट लग","खुली तार")){
    category="Safety"; department="Emergency / Safety"; severity="CRITICAL"; score=96; confidence=97;
    solution="Immediately flag for human review and contact the appropriate emergency or safety authority."; matched="safety";
  } else if(has("street light","streetlight","street lamp","light not working","light is not working","light not work","light is broken","broken light","bulb not working","bulb is broken","electricity problem","electricity issue","power problem","power issue","power cut","power outage","electric fault","electrical fault","wiring fault","wiring issue","electric wire","electricity","electrical","power","wiring","bulb","light band","light bandh","light kharab","light nahi","bijli","bijli nahi","bijli problem","bijli ki problem","bijli band","बिजली","स्ट्रीट लाइट","लाइट बंद","लाइट खराब","बल्ब","वायरिंग")){
    category="Electricity"; department="Electrical Department";
    severity=has("live wire","electric shock","करंट")?"CRITICAL":"MEDIUM";
    score=has("live wire","electric shock","करंट")?94:55; confidence=96;
    solution="Inspect the electrical fixture, wiring and power supply; repair or replace the faulty component."; matched="electricity";
  } else if(has("pothole","potholes","road damage","damaged road","broken road","road is broken","road problem","manhole","road crack","गड्ढा","गड्ढे","सड़क खराब","सड़क खराब","सड़क टूटी","सड़क टूटी","मैनहोल")){
    category="Road Infrastructure"; department="Road Maintenance"; severity="HIGH"; score=82; confidence=95;
    solution="Inspect the location, secure the area if needed, and schedule road repair."; matched="road";
  } else if(has("water leak","water leakage","pipeline","pipe leak","drain","drainage","sewage","sewer","nali","नाली","पानी leak","पानी लीक","पानी की समस्या","water problem","water issue","overflowing drain","सीवेज")){
    category="Water & Sanitation"; department="Water Department"; severity="MEDIUM"; score=62; confidence=94;
    solution="Inspect the water/drainage network and schedule maintenance."; matched="water";
  } else if(has("garbage","waste","trash","dustbin","litter","kachra","कचरा","कूड़ा","कूड़ा","dustbin full","garbage collection")){
    category="Waste Management"; department="Sanitation Department"; severity="MEDIUM"; score=58; confidence=94;
    solution="Schedule collection and inspect the waste-management point."; matched="waste";
  } else if(has("bus","traffic","traffic signal","signal problem","transport","बस","ट्रैफिक","यातायात","सिग्नल")){
    category="Transport"; department="Transport Department"; severity="MEDIUM"; score=60; confidence=93;
    solution="Verify the transport issue and route it to the responsible team."; matched="transport";
  } else if(image){
    category="Visual Issue"; department="General Support"; severity="LOW"; score=25; confidence=80;
    solution="Image uploaded. Connect a computer-vision model for visual classification."; matched="image";
  }
  return {category,department,severity,score,confidence,solution,matched};
}

function rootCause(category){
  return ({
    "Road Infrastructure":"Damaged pavement, drainage issues, heavy traffic or delayed maintenance.",
    "Water & Sanitation":"Blockage, leakage, network damage or inadequate drainage.",
    "Waste Management":"Missed collection, overflowing bins or insufficient collection capacity.",
    "Electricity":"Damaged fixture, wiring fault, supply interruption or component failure.",
    "Transport":"Signal fault, congestion, scheduling issue or infrastructure problem.",
    "Safety":"Potentially hazardous condition; verify the situation on site before action.",
    "Visual Issue":"Visual cause requires computer-vision model confirmation."
  })[category]||"Root cause requires inspection and human verification.";
}

function similarity(a,b){
  const A=new Set(String(a||"").toLowerCase().split(/\W+/).filter(x=>x.length>3));
  const B=new Set(String(b||"").toLowerCase().split(/\W+/).filter(x=>x.length>3));
  if(!A.size||!B.size) return 0;
  let same=0; for(const x of A) if(B.has(x)) same++;
  return Math.round((same/Math.max(A.size,B.size))*100);
}
function slaHours(sev){return sev==="CRITICAL"?4:sev==="HIGH"?12:sev==="MEDIUM"?24:48;}
function enrich(p){
  const age=(Date.now()-new Date(p.createdAt).getTime())/3600000;
  return {...p,ageHours:Math.round(age*10)/10,slaHours:slaHours(p.severity),overdue:p.status!=="Resolved"&&age>slaHours(p.severity)};
}
function activity(data,entry){data.push(entry)}

app.get("/api/health",(q,s)=>s.json({ok:true,version:"4.0.0",project:"ResolveX Major"}));
app.post("/api/login",(req,res)=>{
  const u=USERS.find(x=>x.email===req.body.email&&x.password===req.body.password);
  if(!u) return res.status(401).json({error:"Invalid demo credentials"});
  res.json({token:tokenFor(u),user:{id:u.id,name:u.name,email:u.email,role:u.role,department:u.department||null}});
});
app.get("/api/me",requireRole(),(req,res)=>res.json(req.user));
app.get("/api/departments/list",(req,res)=>res.json(DEPARTMENTS));

app.get("/api/problems",(req,res)=>{
  let data=read().map(enrich);
  const {q,category,severity,status,department}=req.query;
  if(q){const x=q.toLowerCase();data=data.filter(p=>[p.title,p.description,p.location,p.id,p.category].some(v=>String(v||"").toLowerCase().includes(x)))}
  if(category&&category!=="All")data=data.filter(p=>p.category===category);
  if(severity&&severity!=="All")data=data.filter(p=>p.severity===severity);
  if(status&&status!=="All")data=data.filter(p=>p.status===status);
  if(department&&department!=="All")data=data.filter(p=>(p.assignedDepartment||p.department)===department);
  res.json(data.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)));
});

app.post("/api/problems",requireRole("Citizen","Admin"),upload.single("image"),(req,res)=>{
  const problems=read();
  const description=req.body.description||req.body.title||"";
  const ai=analyse(description,!!req.file);
  const near=problems.map(p=>({p,sim:similarity(description,p.description)})).filter(x=>x.sim>=55).sort((a,b)=>b.sim-a.sim)[0];
  const now=new Date().toISOString();
  const u=req.user;
  const p={
    id:"RX-"+Date.now().toString().slice(-8),
    title:req.body.title||ai.category+" problem",
    description, location:req.body.location||"Not specified",
    category:ai.category,severity:ai.severity,priorityScore:ai.score,confidence:ai.confidence,
    department:ai.department,assignedDepartment:ai.department,assignmentMode:"AI Suggested",
    aiSolution:ai.solution,rootCause:rootCause(ai.category),aiMatched:ai.matched,
    status:"Reported",image:req.file?"/uploads/"+req.file.filename:null,
    latitude:Number(req.body.latitude||0),longitude:Number(req.body.longitude||0),
    reporterId:u.id,reporterName:u.name,createdAt:now,updatedAt:now,
    duplicateOf:near?near.p.id:null,duplicateSimilarity:near?near.sim:0,
    feedback:null,timeline:[
      {status:"Reported",at:now,by:u.name},
      {status:"AI Analysed",at:now,by:"ResolveX AI"}
    ]
  };
  problems.push(p);write(problems);res.status(201).json(enrich(p));
});

app.patch("/api/problems/:id/status",requireRole("Admin","Department Officer"),(req,res)=>{
  const data=read(),p=data.find(x=>x.id===req.params.id);
  if(!p)return res.status(404).json({error:"Not found"});
  const allowed=["Reported","Assigned","In Progress","Resolved","Reopened"];
  if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid status"});
  if(req.user.role==="Department Officer" && (p.assignedDepartment||p.department)!==req.user.department)
    return res.status(403).json({error:"Complaint is assigned to another department"});
  const now=new Date().toISOString();
  p.status=req.body.status;p.updatedAt=now;
  p.timeline=p.timeline||[];p.timeline.push({status:p.status,at:now,by:req.user.name});
  write(data);res.json(enrich(p));
});

app.patch("/api/problems/:id/department",requireRole("Admin"),(req,res)=>{
  const data=read(),p=data.find(x=>x.id===req.params.id);
  if(!p)return res.status(404).json({error:"Not found"});
  if(!DEPARTMENTS.includes(req.body.department))return res.status(400).json({error:"Invalid department"});
  const now=new Date().toISOString();
  p.assignedDepartment=req.body.department;p.department=p.assignedDepartment;p.assignmentMode="Admin Assigned";p.updatedAt=now;
  p.status=p.status==="Reported"?"Assigned":p.status;
  p.timeline=p.timeline||[];p.timeline.push({status:"Assigned to "+p.assignedDepartment,at:now,by:req.user.name});
  write(data);res.json(enrich(p));
});

app.post("/api/problems/:id/feedback",requireRole("Citizen","Admin"),(req,res)=>{
  const data=read(),p=data.find(x=>x.id===req.params.id);
  if(!p)return res.status(404).json({error:"Not found"});
  p.feedback={resolved:!!req.body.resolved,rating:Math.max(1,Math.min(5,Number(req.body.rating||0))),comment:req.body.comment||"",at:new Date().toISOString()};
  if(!p.feedback.resolved){p.status="Reopened";p.timeline.push({status:"Reopened by citizen",at:new Date().toISOString(),by:req.user.name});}
  p.updatedAt=new Date().toISOString();write(data);res.json(enrich(p));
});

app.get("/api/stats",(q,res)=>{
  const p=read(),byCategory={},bySeverity={},byDept={},byStatus={};
  p.forEach(x=>{
    byCategory[x.category]=(byCategory[x.category]||0)+1;
    bySeverity[x.severity]=(bySeverity[x.severity]||0)+1;
    const d=x.assignedDepartment||x.department||"Unassigned";byDept[d]=(byDept[d]||0)+1;
    byStatus[x.status]=(byStatus[x.status]||0)+1;
  });
  const ratings=p.filter(x=>x.feedback?.rating).map(x=>x.feedback.rating);
  const avgRating=ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1):"—";
  const overdue=p.filter(x=>enrich(x).overdue).length;
  res.json({total:p.length,resolved:p.filter(x=>x.status==="Resolved").length,pending:p.filter(x=>x.status!=="Resolved").length,high:p.filter(x=>["HIGH","CRITICAL"].includes(x.severity)).length,overdue,avgRating,byCategory,bySeverity,byDept,byStatus});
});

app.get("/api/insights",(q,res)=>{
  const p=read().map(enrich);
  const topCat=Object.entries(p.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+1,a),{})).sort((a,b)=>b[1]-a[1])[0];
  const topDept=Object.entries(p.reduce((a,x)=>{const d=x.assignedDepartment||x.department;a[d]=(a[d]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1])[0];
  const overdue=p.filter(x=>x.overdue).length;
  const critical=p.filter(x=>x.severity==="CRITICAL"&&x.status!=="Resolved").length;
  res.json({
    summary:p.length?`Most reported category: ${topCat?topCat[0]:"—"}. Highest workload department: ${topDept?topDept[0]:"—"}.`:"No reports yet.",
    actions:[
      overdue?`${overdue} complaint(s) are beyond the demo SLA and need attention.`:"No complaint is currently beyond the demo SLA.",
      critical?`${critical} critical complaint(s) remain unresolved.`:"No unresolved critical complaint.",
      topCat?`Monitor ${topCat[0]} because it has ${topCat[1]} report(s).`:"Create reports to generate trend insights."
    ]
  });
});

app.get("/api/export.csv",requireRole("Admin"),(req,res)=>{
  const rows=read();
  const cols=["id","title","location","category","severity","priorityScore","assignedDepartment","status","createdAt","updatedAt","duplicateOf","duplicateSimilarity"];
  const escCsv=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const csv=[cols.join(","),...rows.map(r=>cols.map(c=>escCsv(r[c])).join(","))].join("\n");
  res.setHeader("Content-Type","text/csv");res.setHeader("Content-Disposition","attachment; filename=resolvex-report.csv");res.send(csv);
});

app.get("/api/notifications",requireRole(),(req,res)=>{
  const p=read().map(enrich);
  const out=[];
  p.filter(x=>x.overdue).slice(0,10).forEach(x=>out.push({type:"SLA",title:`SLA overdue: ${x.id}`,text:x.title}));
  p.filter(x=>x.status==="Resolved"&&!x.feedback).slice(0,10).forEach(x=>out.push({type:"Feedback",title:`Feedback pending: ${x.id}`,text:x.title}));
  p.filter(x=>x.duplicateOf).slice(0,10).forEach(x=>out.push({type:"Duplicate",title:`Similar report: ${x.id}`,text:`${x.duplicateSimilarity}% similarity with ${x.duplicateOf}`}));
  res.json(out.slice(0,12));
});

app.get("*",(q,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`ResolveX Major v4 running on http://localhost:${PORT}`));
