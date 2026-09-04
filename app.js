const APP_KEY="yarnicorn.data.v2";
const SETTINGS_KEY="yarnicorn.settings.v1";
const seed={
  projects:[],stash:[],patterns:[],counters:[{id:"rows",name:"Rows",value:0},{id:"stitches",name:"Stitches",value:0}],
  quickRow:0,quickNotes:"",
  granny:{name:"Autumn Blanket",cols:5,rows:6,base:"#fff3e7",palette:["#d66f42","#8c5134","#f3c764","#9a7c50","#f4eee2"],squares:[],selectedIndex:0},
  currentPattern:null,
  palette:{name:"Girlypop",colors:["#f6cfe0","#e985b0","#d85f96","#fff3e7","#7f5f72"]}
};
let data=loadData();
let settings=loadSettings();
if(settings.darkMode) document.body.classList.add("dark");
let projectFilter="all";
let activeScreen="home";
let deferredPrompt=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function id(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function loadData(){try{return {...structuredClone(seed),...JSON.parse(localStorage.getItem(APP_KEY)||"{}")}}catch{return structuredClone(seed)}}
function loadSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}catch{return {}}}
function persist(){localStorage.setItem(APP_KEY,JSON.stringify(data));renderAll()}
function persistSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}

function formatDate(d){if(!d)return"";try{return new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}catch{return d}}
function truncate(s="",n=140){s=String(s);return s.length>n?s.slice(0,n-1)+"…":s}
async function imageFileToDataUrl(file,maxSide=1200,quality=.78){
  if(!file || !file.size) return "";
  const img = new Image();
  const blobUrl = URL.createObjectURL(file);
  img.src = blobUrl;
  await img.decode();
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(blobUrl);
  try { return canvas.toDataURL("image/webp", quality); }
  catch { return canvas.toDataURL("image/jpeg", quality); }
}
function statusLabel(v){return ({todo:"Not started",doing:"In progress",done:"Finished",joined:"Joined"})[v]||"Not started"}
function screen(name){
  activeScreen=name;
  $$(".screen").forEach(x=>x.classList.toggle("active",x.id===name));
  $$(".nav-item,.bottom-nav button").forEach(x=>x.classList.toggle("active",x.dataset.screen===name));
  $("#sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
$$("[data-screen]").forEach(b=>b.addEventListener("click",()=>screen(b.dataset.screen)));
$$("[data-jump]").forEach(b=>b.addEventListener("click",()=>screen(b.dataset.jump)));
$("#mobileMenu").onclick=()=>$("#sidebar").classList.toggle("open");
function updateThemeButton(){
  const dark=document.body.classList.contains("dark");
  $("#themeToggle").textContent=dark?"☀️":"🌙";
  $("#themeToggle").title=dark?"Switch to light mode":"Switch to dark mode";
  $("#themeToggle").setAttribute("aria-label",dark?"Switch to light mode":"Switch to dark mode");
}
$("#themeToggle").onclick=()=>{
  const dark=document.body.classList.toggle("dark");
  settings.darkMode=dark;
  persistSettings();
  updateThemeButton();
};
updateThemeButton();

let activeModalSubmitHandler=null;
function cleanupModal(){
  const form=$("#modalForm");
  if(activeModalSubmitHandler){
    form.removeEventListener("submit",activeModalSubmitHandler);
    activeModalSubmitHandler=null;
  }
}
function modal({title,eyebrow="ADD",fields,saveText="Save",onSave}){
  const dialog=$("#modal"),form=$("#modalForm");
  cleanupModal();
  $("#modalTitle").textContent=title;
  $("#modalEyebrow").textContent=eyebrow;
  $("#modalSave").textContent=saveText;
  $("#modalFields").innerHTML=`<div class="modal-fields-grid">${fields}</div>`;

  const closeWithoutSaving=e=>{
    if(e)e.preventDefault();
    cleanupModal();
    if(dialog.open)dialog.close("cancel");
  };
  $$("[data-modal-cancel]").forEach(btn=>btn.onclick=closeWithoutSaving);

  activeModalSubmitHandler=async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const obj=Object.fromEntries(fd.entries());
    try{
      await onSave(obj,fd);
      cleanupModal();
      if(dialog.open)dialog.close("default");
    }catch(err){
      console.error(err);
      alert("Yarnicorn hit a snag while saving that item. Your current screen has not been cleared.");
    }
  };
  form.addEventListener("submit",activeModalSubmitHandler);
  dialog.showModal();
}
$("#modal").addEventListener("cancel",e=>{
  e.preventDefault();
  cleanupModal();
  $("#modal").close("cancel");
});
$("#modal").addEventListener("close",cleanupModal);
function field(label,name,value="",type="text",extra="",wide=false){return `<label class="${wide?"modal-wide":""}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`}
function selectField(label,name,options,value="",wide=false){return `<label class="${wide?"modal-wide":""}">${label}<select name="${name}">${options.map(o=>`<option ${o===value?"selected":""}>${esc(o)}</option>`).join("")}</select></label>`}
function textAreaField(label,name,value="",wide=true){return `<label class="${wide?"modal-wide":""}">${label}<textarea name="${name}">${esc(value)}</textarea></label>`}

function renderAll(){
  $("#statWips").textContent=data.projects.filter(p=>p.status==="wip").length;
  $("#statStash").textContent=data.stash.length;
  $("#statPatterns").textContent=data.patterns.length;
  $("#statFinished").textContent=data.projects.filter(p=>p.status==="finished").length;
  $("#quickRowCount").textContent=data.quickRow||0;
  $("#quickNotes").value=data.quickNotes||"";
  renderHomeWips();renderProjects();renderStash();renderPatterns();renderGranny();renderPalette();renderCounters();renderGallery();
}
function renderHomeWips(){
  const list=data.projects.filter(p=>p.status==="wip").slice(0,4);
  $("#homeWips").innerHTML=list.length?list.map(p=>`<button class="mini-project text-button" data-home-project="${p.id}">${p.photo?`<img class="mini-project-photo" src="${p.photo}" alt="">`:""}<strong>${esc(p.name)}</strong><small>${clamp(+p.progress||0,0,100)}% complete</small></button>`).join(""):`<div class="empty">No WIPs yet. Start something cute.</div>`;
  $$("[data-home-project]").forEach(b=>b.onclick=()=>{projectFilter="wip";screen("projects");renderProjects()});
}
$("#quickRowPlus").onclick=()=>{data.quickRow=(data.quickRow||0)+1;persist()};
$("#quickRowMinus").onclick=()=>{data.quickRow=Math.max(0,(data.quickRow||0)-1);persist()};
$("#quickRowReset").onclick=()=>{data.quickRow=0;persist()};
$("#quickNotes").addEventListener("input",e=>{data.quickNotes=e.target.value;localStorage.setItem(APP_KEY,JSON.stringify(data))});
$("#projectPicker").onclick=()=>{
  const yarns=data.stash.filter(s=>s.category==="Yarn");
  const ideas=[
    ["Tiny amigurumi","Perfect for using smaller amounts of yarn and practicing shaping."],
    ["Granny-square accent pillow","Play with color without committing to a full blanket."],
    ["Chunky plush","A quick dopamine project with a dramatic result."],
    ["Giftable coaster set","Fast, useful, and easy to personalize."],
    ["Mini seasonal motif","Make a pumpkin, leaf, flower, heart, or tiny critter."],
    ["Crochet keychain","Great for leftover yarn and hardware."],
    ["Small lace accessory","Try finer yarn on a delicate bookmark, kerchief, or veil sample."]
  ];
  let pick=ideas[Math.floor(Math.random()*ideas.length)];
  if(yarns.some(y=>String(y.weight).includes("#6"))) pick=["Chunky plush","You already have super-bulky yarn in your stash — extremely stuffie-coded."];
  $("#projectPickerResult").innerHTML=`<strong>${pick[0]}</strong><br>${pick[1]}`;
};

$("#addProject").onclick=()=>openProjectModal();
function openProjectModal(existing=null){
  const p=existing||{};
  modal({title:existing?"Edit project":"New project",eyebrow:"PROJECT",fields:
    field("Project name","name",p.name||"","text","required",true)+
    selectField("Status","status",["planned","wip","finished","abandoned"],p.status||"wip")+
    selectField("Type","type",["Amigurumi / Plush","Granny Square Blanket","Blanket","Wearable","Coaster / Home","Gift","Lace / Veil","Other"],p.type||"Amigurumi / Plush")+
    field("Progress %","progress",p.progress??0,"number",'min="0" max="100"')+
    field("Hook","hook",p.hook||"")+
    field("Yarn / colors","yarn",p.yarn||"", "text","",true)+
    field("Pattern link / name","pattern",p.pattern||"", "text","",true)+
    field("Start date","startDate",p.startDate||"","date")+
    field("Deadline","deadline",p.deadline||"","date")+
    (p.photo?`<label class="modal-wide">Current photo<div class="form-photo-wrap"><img class="form-photo-preview" src="${p.photo}" alt=""></div></label>`:"")+
    `<label class="modal-wide">Project photo<input name="photoFile" type="file" accept="image/*"></label>`+
    (p.photo?`<label class="check-row modal-wide"><input name="removePhoto" type="checkbox"> Remove current photo</label>`:"")+
    textAreaField("Notes","notes",p.notes||""),
    onSave:async (o,fd)=>{
      let photo = p.photo || "";
      const photoFile = fd.get("photoFile");
      if(o.removePhoto==="on") photo = "";
      if(photoFile && photoFile.size) photo = await imageFileToDataUrl(photoFile, 1200, .78);
      const obj={...p,id:p.id||id(),name:o.name,status:o.status,type:o.type,progress:+o.progress||0,hook:o.hook,yarn:o.yarn,pattern:o.pattern,startDate:o.startDate,deadline:o.deadline,notes:o.notes,photo};
      if(existing)data.projects=data.projects.map(x=>x.id===p.id?obj:x);else data.projects.unshift(obj);
      persist();toast(existing?"Project updated":"Project added");
    }
  });
}
function renderProjects(){
  $$("#projectFilters button").forEach(b=>b.classList.toggle("active",b.dataset.projectFilter===projectFilter));
  const list=data.projects.filter(p=>projectFilter==="all"||p.status===projectFilter);
  $("#projectGrid").innerHTML=list.length?list.map(p=>`<article class="card item-card">
    ${p.photo?`<div class="card-photo-wrap"><img class="card-photo" src="${p.photo}" alt=""></div>`:""}
    <div class="status-ribbon status-${p.status}">${p.status==="abandoned"?"graveyard":p.status}</div>
    <h3>${esc(p.name)}</h3><div class="meta">${esc(p.type||"Project")}${p.startDate?` · Started ${formatDate(p.startDate)}`:""}</div>
    <div class="progress-shell"><span style="width:${clamp(+p.progress||0,0,100)}%"></span></div><div class="progress-number">${clamp(+p.progress||0,0,100)}% complete</div>
    <div class="tags">${p.hook?`<span class="tag">Hook ${esc(p.hook)}</span>`:""}${p.yarn?`<span class="tag">${esc(p.yarn)}</span>`:""}${p.deadline?`<span class="tag">Due ${formatDate(p.deadline)}</span>`:""}</div>
    ${p.notes?`<div class="meta">${esc(truncate(p.notes,160))}</div>`:""}
    <div class="item-actions"><button class="soft-button" data-edit-project="${p.id}">Edit</button><button class="danger-button" data-delete-project="${p.id}">Delete</button></div>
  </article>`).join(""):`<div class="card empty">Nothing here yet.</div>`;
  $$("[data-edit-project]").forEach(b=>b.onclick=()=>openProjectModal(data.projects.find(p=>p.id===b.dataset.editProject)));
  $$("[data-delete-project]").forEach(b=>b.onclick=()=>{if(confirm("Delete this project?")){data.projects=data.projects.filter(p=>p.id!==b.dataset.deleteProject);persist()}});
}
$("#projectFilters").onclick=e=>{const b=e.target.closest("button");if(!b)return;projectFilter=b.dataset.projectFilter;renderProjects()};

$("#addStash").onclick=()=>openStashModal();
function openStashModal(existing=null){
  const s=existing||{};
  modal({title:existing?"Edit supply":"Add supply",eyebrow:"STASH",fields:
    selectField("Category","category",["Yarn","Crochet Hook","Tapestry Needle","Safety Eyes","Stuffing","Stitch Markers","Keychain Hardware","Embroidery Floss","Blocking","Other"],s.category||"Yarn")+
    field("Name / brand","name",s.name||"","text","required")+
    field("Color name","colorName",s.colorName||"")+
    field("Color swatch","color",s.color||"#e985b0","color")+
    field("Yarn weight / size","weight",s.weight||"")+
    field("Quantity","qty",s.qty??1,"number",'min="0" step="0.1"')+
    field("Yards / meters","yardage",s.yardage||"")+
    field("Fiber / material","fiber",s.fiber||"")+
    field("Dye lot","dyeLot",s.dyeLot||"")+
    field("Storage location","location",s.location||"")+
    (s.photo?`<label class="modal-wide">Current photo<div class="form-photo-wrap"><img class="form-photo-preview" src="${s.photo}" alt=""></div></label>`:"")+
    `<label class="modal-wide">Supply photo<input name="photoFile" type="file" accept="image/*"></label>`+
    (s.photo?`<label class="check-row modal-wide"><input name="removePhoto" type="checkbox"> Remove current photo</label>`:"")+
    textAreaField("Notes","notes",s.notes||""),
    onSave:async (o,fd)=>{
      let photo = s.photo || "";
      const photoFile = fd.get("photoFile");
      if(o.removePhoto==="on") photo = "";
      if(photoFile && photoFile.size) photo = await imageFileToDataUrl(photoFile, 1100, .76);
      const obj={...s,id:s.id||id(),category:o.category,name:o.name,colorName:o.colorName,color:o.color,weight:o.weight,qty:+o.qty||0,yardage:o.yardage,fiber:o.fiber,dyeLot:o.dyeLot,location:o.location,notes:o.notes,photo};
      if(existing)data.stash=data.stash.map(x=>x.id===s.id?obj:x);else data.stash.unshift(obj);persist();toast("Stash saved");
    }});
}
function renderStash(){
  const q=$("#stashSearch")?.value?.toLowerCase()||"";const cat=$("#stashCategoryFilter")?.value||"all";
  const list=data.stash.filter(s=>(cat==="all"||s.category===cat)&&JSON.stringify(s).toLowerCase().includes(q));
  $("#stashGrid").innerHTML=list.length?list.map(s=>`<article class="card item-card">
    ${s.photo?`<div class="card-photo-wrap"><img class="card-photo" src="${s.photo}" alt=""></div>`:""}
    <h3>${s.category==="Yarn"?`<span class="color-dot" style="background:${esc(s.color||"#ddd")}"></span>`:""}${esc(s.name)}</h3>
    <div class="meta">${esc(s.category)}${s.colorName?` · ${esc(s.colorName)}`:""}${s.weight?` · ${esc(s.weight)}`:""}</div>
    <div class="tags"><span class="tag">Qty ${s.qty??1}</span>${s.yardage?`<span class="tag">${esc(s.yardage)}</span>`:""}${s.fiber?`<span class="tag">${esc(s.fiber)}</span>`:""}${s.location?`<span class="tag">${esc(s.location)}</span>`:""}</div>
    ${s.notes?`<div class="meta">${esc(truncate(s.notes,160))}</div>`:""}
    <div class="item-actions"><button class="soft-button" data-edit-stash="${s.id}">Edit</button><button class="danger-button" data-delete-stash="${s.id}">Delete</button></div>
  </article>`).join(""):`<div class="card empty">No matching stash items.</div>`;
  $$("[data-edit-stash]").forEach(b=>b.onclick=()=>openStashModal(data.stash.find(s=>s.id===b.dataset.editStash)));
  $$("[data-delete-stash]").forEach(b=>b.onclick=()=>{if(confirm("Delete this stash item?")){data.stash=data.stash.filter(s=>s.id!==b.dataset.deleteStash);persist()}});
}
$("#stashSearch").addEventListener("input",renderStash);$("#stashCategoryFilter").addEventListener("change",renderStash);

$("#newPattern").onclick=()=>openPatternModal();
async function readPatternFile(file){
  if(!file)return"";
  if(file.type==="text/plain"||file.name.toLowerCase().endsWith(".txt"))return await file.text();
  if(file.name.toLowerCase().endsWith(".pdf")){
    try{
      if(!window.pdfjsLib){
        await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";s.type="module";s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
      }
    }catch{}
    try{
      const pdfjs=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
      const bytes=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjs.getDocument({data:bytes}).promise;let out="";
      for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const text=await page.getTextContent();out+=text.items.map(x=>x.str).join(" ")+"\n"}
      return out;
    }catch(e){alert("I couldn't extract text from that PDF in this browser. You can paste the pattern text instead.");return""}
  }
  alert("For line-by-line extraction, use .txt or a text-based PDF. Image/scanned patterns can still be kept as a reference, but need manual text entry in this version.");
  return"";
}
function patternToSteps(text){
  return text.split(/\n+/).map(s=>s.trim()).filter(Boolean).flatMap(line=>{
    if(line.length>180)return line.split(/(?<=[.;])\s+/).filter(Boolean);
    return [line];
  }).map(text=>({id:id(),text,done:false}));
}
function openPatternModal(existing=null){
  const p=existing||{};
  modal({title:existing?"Edit pattern":"Add pattern",eyebrow:"PATTERN",fields:
    field("Pattern name","name",p.name||"","text","required",true)+
    field("Source / link","source",p.source||"","text","",true)+
    `<label class="modal-wide">Import .txt or text-based PDF<input name="patternFile" type="file" accept=".txt,.pdf,text/plain,application/pdf"></label>`+
    textAreaField("Pattern text","text",p.rawText||"",true),
    saveText:existing?"Update":"Import",
    onSave:async(o,fd)=>{
      const f=fd.get("patternFile");let text=o.text||"";
      if(f&&f.size)text=(await readPatternFile(f))||text;
      const obj={...p,id:p.id||id(),name:o.name,source:o.source,rawText:text,notes:p.notes||"",steps:existing&&text===p.rawText?p.steps:patternToSteps(text)};
      if(existing)data.patterns=data.patterns.map(x=>x.id===p.id?obj:x);else data.patterns.unshift(obj);
      data.currentPattern=obj.id;persist();toast("Pattern ready");
    }});
}
function renderPatterns(){
  $("#patternLibrary").innerHTML=data.patterns.length?data.patterns.map(p=>`<button class="pattern-list-button ${data.currentPattern===p.id?"active":""}" data-pattern="${p.id}"><strong>${esc(p.name)}</strong><small>${p.steps?.filter(s=>s.done).length||0}/${p.steps?.length||0} steps</small></button>`).join(""):`<div class="empty">No saved patterns.</div>`;
  const p=data.patterns.find(x=>x.id===data.currentPattern);
  $("#patternEmpty").classList.toggle("hidden",!!p);$("#patternActive").classList.toggle("hidden",!p);
  if(!p)return;
  $("#patternTitle").textContent=p.name;$("#patternNotes").value=p.notes||"";
  const total=p.steps?.length||0,done=p.steps?.filter(s=>s.done).length||0,pct=total?Math.round(done/total*100):0;
  $("#patternProgressBar").style.width=pct+"%";$("#patternProgressText").textContent=`${done} / ${total} · ${pct}%`;
  $("#patternSteps").innerHTML=(p.steps||[]).map((s,i)=>`<label class="pattern-step ${s.done?"done":""}">
    <input type="checkbox" data-step="${s.id}" ${s.done?"checked":""}><div><div class="meta">STEP ${i+1}</div><div class="step-text">${esc(s.text)}</div></div></label>`).join("");
  $$("[data-pattern]").forEach(b=>b.onclick=()=>{data.currentPattern=b.dataset.pattern;persist()});
  $$("[data-step]").forEach(c=>c.onchange=()=>{const pp=data.patterns.find(x=>x.id===data.currentPattern);const st=pp.steps.find(x=>x.id===c.dataset.step);st.done=c.checked;persist()});
}
$("#patternNotes").addEventListener("input",e=>{const p=data.patterns.find(x=>x.id===data.currentPattern);if(p){p.notes=e.target.value;localStorage.setItem(APP_KEY,JSON.stringify(data))}});
$("#patternEdit").onclick=()=>{const p=data.patterns.find(x=>x.id===data.currentPattern);if(p)openPatternModal(p)};
$("#patternDelete").onclick=()=>{if(confirm("Delete this pattern?")){data.patterns=data.patterns.filter(x=>x.id!==data.currentPattern);data.currentPattern=data.patterns[0]?.id||null;persist()}};
$("#patternResetChecks").onclick=()=>{const p=data.patterns.find(x=>x.id===data.currentPattern);if(p&&confirm("Reset all pattern checkmarks?")){p.steps.forEach(s=>s.done=false);persist()}};

function ensureGranny(){
  const g=data.granny;
  if(!g.palette?.length)g.palette=["#d66f42","#8c5134","#f3c764","#9a7c50","#f4eee2"];
  const n=(g.cols||5)*(g.rows||6);
  while(g.squares.length<n)g.squares.push({color:g.palette[g.squares.length%g.palette.length],status:"todo"});
  g.squares=g.squares.slice(0,n).map((s,i)=>({
    color:s.color||g.palette[i%g.palette.length],
    status:s.status||"todo",
    motif:s.motif||""
  }));
  if(typeof g.selectedIndex!=="number") g.selectedIndex=0;
  g.selectedIndex=clamp(g.selectedIndex,0,Math.max(0,g.squares.length-1));
}
function renderGranny(){
  ensureGranny();const g=data.granny;
  $("#grannyName").value=g.name||"";$("#grannyCols").value=g.cols;$("#grannyRows").value=g.rows;$("#grannyBase").value=g.base||"#fff3e7";
  $("#grannyPaletteInputs").innerHTML=g.palette.map((c,i)=>`<input type="color" value="${c}" data-granny-color="${i}" aria-label="Palette color ${i+1}">`).join("");
  $("#grannyGrid").style.gridTemplateColumns=`repeat(${g.cols},1fr)`;$("#grannyGrid").style.setProperty("--square-border",g.base);
  $("#grannyGrid").innerHTML=g.squares.map((s,i)=>`<button class="granny-square ${s.motif?"has-motif":""} ${i===g.selectedIndex?"selected":""}" data-square="${i}" data-status="${s.status}" style="background:${s.color};--square-border:${g.base}" title="Square ${i+1}${s.motif?" • motif":""}">${s.motif?`<img class="square-motif" src="${s.motif}" alt="">`:""}</button>`).join("");
  const finished=g.squares.filter(s=>s.status==="done"||s.status==="joined").length;$("#grannyProgress").textContent=`${finished} / ${g.squares.length} done`;
  const selected=g.squares[g.selectedIndex];
  $("#selectedSquareTitle").textContent=`Square ${g.selectedIndex+1}`;
  $("#selectedSquareMeta").textContent=`${statusLabel(selected.status)} · ${selected.motif?"Motif attached":"Solid color"}`;
  $("#selectedSquareNumber").value=g.selectedIndex+1;
  $("#selectedSquareNumber").max=g.squares.length;
  $("#squareEditorColor").value=selected.color||g.palette[0];
  $("#squareEditorStatus").value=selected.status||"todo";
  $("#selectedSquareVisual").style.background=selected.color||g.palette[0];
  $("#selectedSquareVisual").innerHTML=selected.motif?`<img src="${selected.motif}" alt="">`:"";
  $$("[data-granny-color]").forEach(inp=>inp.onchange=()=>{g.palette[+inp.dataset.grannyColor]=inp.value;persist()});
  $$("[data-square]").forEach(b=>b.onclick=()=>{g.selectedIndex=+b.dataset.square;renderGranny()});
}
function selectedGrannySquare(){
  ensureGranny();
  const g=data.granny;
  return {g,index:g.selectedIndex,square:g.squares[g.selectedIndex]};
}
function cycleSquareColor(s,pal){const i=pal.indexOf(s.color);s.color=pal[(i+1)%pal.length]}
$("#addGrannyColor").onclick=()=>{data.granny.palette.push("#e985b0");persist()};
$("#removeGrannyColor").onclick=()=>{if(data.granny.palette.length>2){data.granny.palette.pop();persist()}};
$("#buildGranny").onclick=()=>{data.granny.name=$("#grannyName").value;data.granny.cols=clamp(+$("#grannyCols").value||5,1,20);data.granny.rows=clamp(+$("#grannyRows").value||6,1,20);data.granny.base=$("#grannyBase").value;ensureGranny();persist();toast("Grid updated")};
$("#saveGranny").onclick=()=>{$("#buildGranny").click();toast("Granny plan saved locally")};
$("#clearGranny").onclick=()=>{data.granny.squares.forEach(s=>s.status="todo");persist()};
$("#shuffleGranny").onclick=()=>{shuffleGranny();persist()};
function shuffleGranny(){
  ensureGranny();const g=data.granny,avoid=$("#avoidNeighbors").checked;
  for(let r=0;r<g.rows;r++)for(let c=0;c<g.cols;c++){
    const i=r*g.cols+c;let choices=[...g.palette];
    if(avoid){
      const left=c?g.squares[i-1]?.color:null,up=r?g.squares[i-g.cols]?.color:null;
      choices=choices.filter(x=>x!==left&&x!==up);if(!choices.length)choices=[...g.palette];
    }
    g.squares[i].color=choices[Math.floor(Math.random()*choices.length)];
  }
}
$("#selectedSquareNumber").onchange=()=>{
  ensureGranny();
  const max=data.granny.squares.length;
  data.granny.selectedIndex=clamp((+$("#selectedSquareNumber").value||1)-1,0,Math.max(0,max-1));
  renderGranny();
};
$("#jumpNextSquare").onclick=()=>{
  ensureGranny();
  data.granny.selectedIndex=(data.granny.selectedIndex+1)%data.granny.squares.length;
  renderGranny();
};
$("#squareEditorColor").oninput=()=>{
  const {square}=selectedGrannySquare();
  square.color=$("#squareEditorColor").value;
  persist();
};
$("#squareEditorStatus").onchange=()=>{
  const {square}=selectedGrannySquare();
  square.status=$("#squareEditorStatus").value;
  persist();
};
$("#applySquareMotif").onclick=async()=>{
  const {square,index}=selectedGrannySquare();
  const file=$("#squareEditorMotif").files[0];
  if(!file)return alert("Choose a motif image first.");
  try{
    square.motif=await imageFileToDataUrl(file, 700, .8);
    $("#squareEditorMotif").value="";
    persist();
    toast(`Motif added to square ${index+1}`);
  }catch(e){
    console.error(e);
    alert("I couldn't process that image. Try a JPG, PNG, or WEBP image.");
  }
};
$("#removeSquareMotif").onclick=()=>{
  const {square,index}=selectedGrannySquare();
  square.motif="";
  $("#squareEditorMotif").value="";
  persist();
  toast(`Motif removed from square ${index+1}`);
};

let uploadedImage=null;
$("#grannyImage").onchange=e=>uploadedImage=e.target.files[0]||null;
$("#extractColors").onclick=async()=>{
  if(!uploadedImage)return alert("Choose an inspiration image first.");
  const img=new Image();img.src=URL.createObjectURL(uploadedImage);await img.decode();
  const c=$("#imageCanvas"),ctx=c.getContext("2d");c.width=120;c.height=Math.max(1,Math.round(120*img.height/img.width));ctx.drawImage(img,0,0,c.width,c.height);
  const pix=ctx.getImageData(0,0,c.width,c.height).data,bins=new Map();
  for(let i=0;i<pix.length;i+=16){
    const r=Math.round(pix[i]/32)*32,g=Math.round(pix[i+1]/32)*32,b=Math.round(pix[i+2]/32)*32;
    const key=`${Math.min(r,255)},${Math.min(g,255)},${Math.min(b,255)}`;bins.set(key,(bins.get(key)||0)+1);
  }
  const cols=[...bins.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>"#"+k.split(",").map(n=>(+n).toString(16).padStart(2,"0")).join(""));
  data.granny.palette=cols;
  persist();toast("Palette extracted from image");
};
const vibes={
  "Girlypop":["#f6cfe0","#e985b0","#d85f96","#fff3e7","#7f5f72"],
  "Autumn Harvest":["#d66f42","#8c5134","#e7b65e","#86915b","#f3eadf"],
  "Halloween":["#241b25","#7b4b8b","#e47b35","#e6d9c8","#7d8b5d"],
  "Cottagecore":["#ead6c6","#b7876e","#8f9b72","#d6b7c7","#f3eadf"],
  "Strawberry":["#ec7594","#f6b6c8","#f7e7d2","#6f925f","#c74361"],
  "Pastel Dream":["#f7cfe0","#d7ccf4","#c8e9ec","#f7e3b5","#d7ebcf"],
  "Gothic Romance":["#2d232c","#6d4059","#a95878","#c79caa","#eadfe4"],
  "Christmas Cozy":["#9f3c48","#c97972","#53745c","#d8c5a3","#f6efe4"],
  "Ocean":["#274d66","#3f7d8e","#6cb4b8","#bed9d1","#f2eadf"]
};
function renderPalette(){
  $("#paletteName").textContent=data.palette.name;
  $("#paletteOutput").innerHTML=data.palette.colors.map(c=>`<div class="palette-swatch" style="background:${c}"><span>${c.toUpperCase()}</span></div>`).join("");
  $("#paletteAccessibility").textContent=colorAccessibilityMessage(data.palette.colors);
}
$("#generateVibe").onclick=()=>{const v=$("#vibeSelect").value;data.palette={name:v,colors:[...vibes[v]]};persist()};
function hexToHsl(hex){let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;let max=Math.max(r,g,b),min=Math.min(r,g,b),h,s,l=(max+min)/2;if(max===min){h=s=0}else{let d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h/=6}return[h*360,s*100,l*100]}
function hslToHex(h,s,l){s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];return"#"+[r,g,b].map(v=>Math.round((v+m)*255).toString(16).padStart(2,"0")).join("")}
$("#generateHarmony").onclick=()=>{
  const base=$("#basePaletteColor").value,[h,s,l]=hexToHsl(base),mode=$("#harmonySelect").value;let hs=[];
  if(mode==="Analogous")hs=[h-40,h-20,h,h+20,h+40].map(x=>[x,s,l]);
  if(mode==="Complementary")hs=[[h,s,l],[h+180,s,l],[h,s,l+18],[h+180,s,l+18],[h,s*.55,l-12]];
  if(mode==="Triadic")hs=[[h,s,l],[h+120,s,l],[h+240,s,l],[h,s*.5,l+18],[h+120,s*.45,l+20]];
  if(mode==="Soft monochrome")hs=[[h,s*.4,l+28],[h,s*.6,l+16],[h,s,l],[h,s*.75,l-13],[h,s*.5,l-25]];
  data.palette={name:`${mode} palette`,colors:hs.map(([hh,ss,ll])=>hslToHex((hh%360+360)%360,clamp(ss,5,95),clamp(ll,10,92)))};persist();
};
$("#stashPalette").onclick=()=>{
  const colors=[...new Set(data.stash.filter(s=>s.category==="Yarn"&&s.color).map(s=>s.color))].slice(0,7);
  if(colors.length<2)return alert("Add color swatches to at least two yarn entries first.");
  data.palette={name:"From my stash",colors};persist();
};
$("#sendPaletteToGranny").onclick=()=>{data.granny.palette=[...data.palette.colors];ensureGranny();persist();screen("granny");toast("Palette sent to Granny Studio")};
function colorAccessibilityMessage(colors){
  const vals=colors.map(h=>{const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return .2126*r+.7152*g+.0722*b});
  let close=0;for(let i=0;i<vals.length;i++)for(let j=i+1;j<vals.length;j++)if(Math.abs(vals[i]-vals[j])<24)close++;
  return close?`Color-separation note: ${close} pair${close>1?"s":""} are close in light/dark value. For easier differentiation, consider swapping one for a noticeably lighter or darker yarn.`:"Nice separation: these colors have distinct light/dark values, which helps keep the palette readable even when hue differences are subtle.";
}

$("#addCounter").onclick=()=>modal({title:"New counter",eyebrow:"TOOL",fields:field("Counter name","name","","text","required",true),onSave:o=>{data.counters.push({id:id(),name:o.name,value:0});persist()}});
function renderCounters(){
  $("#counterGrid").innerHTML=data.counters.map(c=>`<article class="card counter-item"><div class="counter-name">${esc(c.name)}</div><div class="big-counter"><button data-counter-minus="${c.id}">−</button><div><b>${c.value}</b><span>count</span></div><button data-counter-plus="${c.id}">+</button></div><div class="two-col"><button class="soft-button" data-counter-reset="${c.id}">Reset</button><button class="danger-button" data-counter-delete="${c.id}">Delete</button></div></article>`).join("");
  $$("[data-counter-plus]").forEach(b=>b.onclick=()=>{const c=data.counters.find(x=>x.id===b.dataset.counterPlus);c.value++;persist()});
  $$("[data-counter-minus]").forEach(b=>b.onclick=()=>{const c=data.counters.find(x=>x.id===b.dataset.counterMinus);c.value=Math.max(0,c.value-1);persist()});
  $$("[data-counter-reset]").forEach(b=>b.onclick=()=>{const c=data.counters.find(x=>x.id===b.dataset.counterReset);c.value=0;persist()});
  $$("[data-counter-delete]").forEach(b=>b.onclick=()=>{if(data.counters.length<=1)return alert("Keep at least one counter.");data.counters=data.counters.filter(x=>x.id!==b.dataset.counterDelete);persist()});
}
$("#gaugeCalc").onclick=()=>{
  const sts=+$("#gaugeSts").value,sw=+$("#gaugeIn").value,w=+$("#gaugeDesired").value;
  $("#gaugeResult").textContent=sts&&sw&&w?`≈ ${Math.round(sts/sw*w)} starting stitches for ${w}" at this gauge.`:"Enter all three numbers.";
};
const yardFactors={blanket:{1:1.9,2:1.7,3:1.45,4:1.2,5:.95,6:.75},granny:{1:2.05,2:1.85,3:1.55,4:1.3,5:1.03,6:.82},scarf:{1:1.45,2:1.3,3:1.1,4:.92,5:.75,6:.6},hat:{1:1.2,2:1.08,3:.93,4:.78,5:.65,6:.52},amigurumi:{1:1.7,2:1.5,3:1.25,4:1.05,5:.9,6:.75},wearable:{1:1.75,2:1.55,3:1.32,4:1.1,5:.9,6:.72}};
$("#estimateYarn").onclick=()=>{
  const type=$("#yarnProjectType").value,w=+$("#yarnWeight").value,width=+$("#yarnWidth").value,len=+$("#yarnLength").value,buffer=+$("#yarnBuffer").value,yps=+$("#yardsPerSkein").value,colors=Math.max(1,+$("#yarnColors").value||1);
  if(!width||!len||!yps)return $("#yarnResult").textContent="Enter dimensions and yards per skein.";
  let area=width*len,yd=area*(yardFactors[type]?.[w]||1.1);
  if(type==="hat")yd=Math.max(110,area*(yardFactors[type][w]));
  if(type==="amigurumi")yd=Math.max(120,area*(yardFactors[type][w]));
  yd=Math.round(yd*(1+buffer));const skeins=Math.ceil(yd/yps),per=Math.ceil(yd/colors);
  $("#yarnResult").innerHTML=`Plan on roughly <strong>${yd.toLocaleString()} yd</strong> total — about <strong>${skeins} skein${skeins===1?"":"s"}</strong> at ${yps} yd each.${colors>1?` If split evenly: ~${per.toLocaleString()} yd/color.`:""}`;
};

function renderGallery(){
  const list=data.projects.filter(p=>p.status==="finished");
  $("#galleryGrid").innerHTML=list.length?list.map(p=>p.photo
    ? `<article class="gallery-card has-photo"><img src="${p.photo}" alt=""><div class="gallery-overlay"><span class="eyebrow">${esc(p.type||"FINISHED")}</span><h3>${esc(p.name)}</h3><div class="meta">${p.yarn?esc(p.yarn):"Crochet victory ✨"}</div></div></article>`
    : `<article class="gallery-card"><span class="eyebrow">${esc(p.type||"FINISHED")}</span><h3>${esc(p.name)}</h3><div class="meta">${p.yarn?esc(p.yarn):"Crochet victory ✨"}</div></article>`
  ).join(""):`<div class="card empty">Finish a project and it will appear here automatically. 💕</div>`;
}

$("#exportData").onclick=()=>{
  const blob=new Blob([JSON.stringify({app:"Yarnicorn",version:2,exportedAt:new Date().toISOString(),data},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`yarnicorn-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
};
$("#importData").onclick=async()=>{
  const f=$("#importDataFile").files[0];if(!f)return alert("Choose a backup file first.");
  try{const obj=JSON.parse(await f.text());data=obj.data||obj;persist();toast("Backup imported")}catch{alert("That file doesn't look like a Yarnicorn backup.")}
};
$("#clearAll").onclick=()=>{if(confirm("Permanently clear all local Yarnicorn data on this device?")){data=structuredClone(seed);persist()}};

$("#supabaseUrl").value=settings.supabaseUrl||"";$("#supabaseKey").value=settings.supabaseKey||"";$("#syncId").value=settings.syncId||"";
["supabaseUrl","supabaseKey","syncId"].forEach(k=>$("#"+k).addEventListener("change",e=>{settings[k]=e.target.value.trim();persistSettings()}));
const generateSyncIdBtn=$("#generateSyncId");
if(generateSyncIdBtn) generateSyncIdBtn.onclick=()=>{
  const bytes=new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const value=[...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
  $("#syncId").value=value;
  settings.syncId=value;
  persistSettings();
  toast("Strong sync ID generated — save this on your other devices too");
};
async function syncRequest(method){
  const url=$("#supabaseUrl").value.trim().replace(/\/+$/,""),
        key=$("#supabaseKey").value.trim(),
        syncId=$("#syncId").value.trim(),
        status=$("#syncStatus");
  if(!url||!key||!syncId){
    alert("Enter the Supabase project URL, publishable key, and your private sync ID first.");
    return;
  }
  settings={...settings,supabaseUrl:url,supabaseKey:key,syncId};
  persistSettings();
  status.textContent=method==="pull"?"Pulling cloud data…":"Pushing local data…";
  try{
    const endpoint=method==="pull"?"yarnicorn_pull":"yarnicorn_push";
    const body=method==="pull"
      ? {sync_secret:syncId}
      : {sync_secret:syncId,new_payload:data};
    const r=await fetch(`${url}/rest/v1/rpc/${endpoint}`,{
      method:"POST",
      headers:{apikey:key,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    if(!r.ok){
      const text=await r.text();
      throw new Error(`${r.status} ${text}`);
    }
    if(method==="pull"){
      const rows=await r.json();
      if(!rows.length){
        status.textContent="No cloud backup found for that sync ID yet.";
        return;
      }
      data=rows[0].payload;
      persist();
      status.textContent=`Pulled cloud data from ${new Date(rows[0].updated_at).toLocaleString()}.`;
      toast("Cloud data pulled");
    }else{
      await r.text();
      status.textContent="Cloud backup updated. You can Pull this data on another device.";
      toast("Cloud backup updated");
    }
  }catch(e){
    status.textContent="Sync failed — see the message below.";
    console.error("Yarnicorn sync error:",e);
    alert("Yarnicorn could not sync. Most often this means the new Supabase setup SQL has not been run yet, or the URL/key is incorrect.\n\nTechnical detail: "+e.message);
  }
}
$("#syncPull").onclick=()=>syncRequest("pull");
$("#syncPush").onclick=()=>syncRequest("push");

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden")});
async function install(){if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else{alert("On iPhone: open this site in Safari → Share → Add to Home Screen. On desktop Chrome/Edge, use the browser's Install App option.")}}
$("#installBtn").onclick=install;$("#installSettings").onclick=install;

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
ensureGranny();renderAll();
