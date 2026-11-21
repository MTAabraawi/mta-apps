(()=>{
const $=s=>document.querySelector(s), cfg=window.MTA_CONFIG||{API_BASE:""}, base=(cfg.API_BASE||"").replace(/\/$/,"");
const labels={android:"Android",windows:"Windows",linux:"Linux",macos:"macOS",ios:"iOS",web:"Web"};
const PAGE_SIZE=12;
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const initials=s=>(String(s||"M").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("")||"M").toUpperCase();
const pagination=window.MTA_PAGINATION;
function appKey(a){return pagination.key(a)}
function mergeApps(current,incoming){return pagination.mergeUnique(current,incoming)}
async function fetchApps(params={},signal){
  const u=new URL(base+"/api/v1/apps",location.origin);
  Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")u.searchParams.set(k,v)});
  const r=await fetch(u,{signal});
  if(!r.ok)throw Error("API "+r.status);
  const data=await r.json();
  const rows=Array.isArray(data)?data:(Array.isArray(data?.rows)?data.rows:null);
  if(!rows)throw Error("Invalid API response");
  const headerTotal=Number(r.headers?.get?.("X-Total-Count"));
  const total=Number.isFinite(headerTotal)&&headerTotal>=0?headerTotal:
    (Number.isFinite(Number(data?.total))?Number(data.total):rows.length);
  return {rows,total};
}
function empty(title,msg){return '<div class="empty"><b>'+esc(title)+'</b>'+esc(msg)+'</div>'}
function card(a){const href=a.app_url||a.source_url||"#";const icon=a.icon_url?'<img class="appIcon" src="'+esc(a.icon_url)+'" alt="" loading="lazy">':'<span class="appIcon fallback">'+esc(initials(a.name))+'</span>';return '<article class="card" data-app-key="'+esc(appKey(a))+'"><a class="appTop" href="app.html?source='+encodeURIComponent(a.source||"")+'&external_id='+encodeURIComponent(a.external_id||"")+'&name='+encodeURIComponent(a.name||"")+'">'+icon+'<span><span class="appName">'+esc(a.name)+'</span><span class="dev">'+esc(a.developer||"مطور التطبيق")+'</span></span></a><p class="summary">'+esc(a.summary||a.description||"اكتشف تفاصيل التطبيق ومصدره الرسمي.")+'</p><div class="tags"><span class="tag">'+esc(labels[a.platform]||a.platform||"تطبيق")+'</span>'+(a.category?'<span class="tag">'+esc(a.category)+'</span>':"")+'</div><a class="download" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">زيارة صفحة التطبيق ↗</a></article>'}
async function home(){const el=$("#homeApps");if(!el)return;try{const result=await fetchApps({limit:8});el.innerHTML=result.rows.length?result.rows.map(card).join(""):empty("الكتالوج جاهز لاستقبال التطبيقات","ستظهر التطبيقات هنا بعد ربط قاعدة البيانات.")}catch(e){el.innerHTML=empty("كتالوج التطبيقات غير متصل","اضبط API_BASE في assets/js/config.js بعد نشر محرك التطبيقات.")}}
async function explore(){
  const el=$("#results"),q=$("#q"),p=$("#platform"),sort=$("#sort"),count=$("#count");
  const moreWrap=$("#loadMoreWrap"),moreButton=$("#loadMore"),status=$("#loadStatus"),sentinel=$("#loadSentinel");
  if(!el)return;
  let timer=null,items=[],offset=0,total=0,loading=false,autoPaused=false,version=0,controller=null,observer=null;
  const hasMore=()=>pagination.hasMore(offset,total,items.length);
  function updateControls(){
    if(count)count.textContent=total?items.length+" من "+total+" تطبيق":items.length+" تطبيق";
    if(moreWrap)moreWrap.hidden=!(hasMore()||autoPaused);
    if(moreButton){moreButton.disabled=loading;moreButton.textContent=loading?"جارٍ التحميل…":"تحميل المزيد";}
    if(status&& !loading && !autoPaused)status.textContent=hasMore()?"سيتم تحميل المزيد تلقائياً عند الاقتراب من نهاية القائمة.":"وصلت إلى نهاية النتائج.";
  }
  function renderAppend(rows){
    const placeholder=el.querySelector(".empty");
    if(placeholder)placeholder.remove();
    const fragment=document.createElement("div");
    fragment.innerHTML=rows.map(card).join("");
    while(fragment.firstElementChild)el.appendChild(fragment.firstElementChild);
  }
  async function load(reset=false,manual=false){
    if(loading)return;
    if(!reset&&!hasMore()&&!(autoPaused&&manual))return;
    if(!reset&&autoPaused&&!manual)return;
    if(reset){
      version++;
      if(controller)controller.abort();
      controller=null;
      loading=false;
      items=[];offset=0;total=0;autoPaused=false;
      if(!el.querySelector(".card"))el.innerHTML=empty("جارٍ تحميل التطبيقات…","");
      if(status)status.textContent="";
    }
    const requestVersion=version;
    const requestController=new AbortController();
    controller=requestController;loading=true;
    if(status)status.textContent="جارٍ تحميل دفعة من التطبيقات…";
    updateControls();
    try{
      const result=await fetchApps({q:q.value.trim(),platform:p.value,limit:PAGE_SIZE,offset},requestController.signal);
      if(requestVersion!==version)return;
      if(manual)autoPaused=false;
      const unique=mergeApps(items,result.rows);
      const added=unique.length-items.length;
      items=unique;
      offset+=result.rows.length;
      total=result.total;
      if(sort.value==="name"){
        items.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
        el.innerHTML="";
        renderAppend(items);
      }else{
        if(reset)el.innerHTML="";
        if(added>0){
          const existing=new Set(Array.from(el.querySelectorAll(".card")).map(node=>node.dataset.appKey));
          renderAppend(items.filter(item=>!existing.has(appKey(item))));
        }
      }
      if(!items.length)el.innerHTML=empty("لا توجد نتائج","غيّر البحث أو المنصة وحاول مجدداً.");
      if(result.rows.length===0||offset>=total)offset=Math.max(offset,total);
      if(status)status.textContent=autoPaused?"توقف التحميل التلقائي بعد تعذر الاتصال. استخدم الزر للمحاولة يدوياً.":(hasMore()?"اقترب من نهاية القائمة لتحميل 12 تطبيقاً إضافياً.":"وصلت إلى نهاية النتائج.");
    }catch(error){
      if(error.name!=="AbortError"&&requestVersion===version){
        autoPaused=true;
        if(status)status.textContent="تعذر تحميل الدفعة التالية؛ أوقفنا التحميل التلقائي. يمكنك إعادة المحاولة يدوياً.";
        if(!items.length&&!el.querySelector(".card"))el.innerHTML=empty("تعذر الاتصال بالكتالوج","تحقق من الاتصال ثم استخدم زر «إعادة المحاولة».");
      }
    }finally{
      if(requestVersion===version){
        loading=false;
        if(controller===requestController)controller=null;
        if(moreButton)moreButton.textContent=autoPaused?"إعادة المحاولة":"تحميل المزيد";
        updateControls();
      }
    }
  }
  function refresh(){load(true)}
  q.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(refresh,300)});
  p.addEventListener("change",refresh);
  sort.addEventListener("change",()=>{
    if(sort.value==="name")items.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    el.innerHTML="";renderAppend(items);updateControls();
  });
  if(moreButton)moreButton.addEventListener("click",()=>load(false,true));
  if("IntersectionObserver" in window&&sentinel){
    observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))load(false,false);
    },{root:null,rootMargin:"600px 0px",threshold:0});
    observer.observe(sentinel);
  }
  const params=new URLSearchParams(location.search);
  q.value=params.get("q")||"";p.value=params.get("platform")||"";
  await load(true);
}
async function detail(){const el=$("#detail");if(!el)return;const params=new URLSearchParams(location.search);try{const result=await fetchApps({q:params.get("name")||"",limit:100});const list=result.rows;const a=list.find(x=>(!params.get("source")||x.source===params.get("source"))&&(!params.get("external_id")||x.external_id===params.get("external_id")))||list[0];if(!a){el.innerHTML=empty("التطبيق غير موجود","لم نعثر على هذا التطبيق في الفهرس.");return}const icon=a.icon_url?'<img class="detailIcon" src="'+esc(a.icon_url)+'" alt="">':'<div class="detailIcon fallback">'+esc(initials(a.name))+'</div>';el.innerHTML='<div class="detail"><aside class="panel">'+icon+'<h2>'+esc(a.name)+'</h2><p class="muted">'+esc(a.developer||"مطور غير محدد")+'</p><p><span class="tag">'+esc(labels[a.platform]||a.platform)+'</span></p><a class="btn" href="'+esc(a.app_url||a.source_url||"#")+'" target="_blank" rel="noopener">الانتقال إلى صفحة التطبيق ↗</a></aside><article class="panel"><h2>عن التطبيق</h2><p>'+esc(a.description||a.summary||"لا يوجد وصف تفصيلي.")+'</p><h3>معلومات التطبيق</h3><p>المنصة: '+esc(labels[a.platform]||a.platform)+'</p><p>المطور: '+esc(a.developer||"غير محدد")+'</p><p>الفئة: '+esc(a.category||"غير مصنفة")+'</p><p>الترخيص: '+esc(a.license||"غير محدد")+'</p><div class="notice">زر الانتقال يفتح صفحة التطبيق لدى المتجر أو المطوّر الأصلي. لا نستضيف ملفات التثبيت ولا نعيد توزيعها.</div></article></div>'}catch(e){el.innerHTML=empty("تعذر تحميل التفاصيل","تحقق من اتصال محرك التطبيقات.")}}
document.addEventListener("DOMContentLoaded",()=>{const m=$(".menu"),links=$(".links");if(m)m.onclick=()=>links.classList.toggle("open");const year=$("#year");if(year)year.textContent=new Date().getFullYear();home();explore();detail()});
})();