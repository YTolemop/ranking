'use strict';
const $=id=>document.getElementById(id),KEY='bracket-club-v1',shared=Cloud.configured;
let state=null,localBackup=null,history=[],toastTimer,busy=false,canEdit=!shared,revision=0,lastWidth='',cloudReady=false,refreshing=false,pendingMatches=[],focusedMatch='';
try{const saved=localStorage.getItem(KEY);if(saved)localBackup=Bracket.validate(JSON.parse(saved));}catch{}
if(!shared)state=localBackup||Bracket.create(15);
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000)}
function status(text){$('saved').textContent=text}
function applyAccess(){
 $('setup').hidden=!canEdit;document.querySelectorAll('[data-edit]').forEach(el=>{el.hidden=!canEdit;el.disabled=busy});
 ['title','count','draw'].forEach(id=>$(id).disabled=busy||!canEdit);
 $('login').hidden=shared&&canEdit;$('logout').hidden=!shared||!canEdit;
 $('mode').textContent=shared?(canEdit?'管理者':'公開檢視'):'本機模式';
 document.querySelector('.hint>span').textContent=canEdit?'拖曳空白處移動 · 點選選手晉級':'拖曳空白處移動查看';
 $('export').disabled=!state;$('print').disabled=!state;$('view').disabled=!state;
 $('migrate').hidden=!shared||!canEdit||!!state||!localBackup;
}
function showEmpty(){
 $('pending-panel').hidden=true;pendingMatches=[];focusedMatch='';
 $('bracket').hidden=true;$('podium').replaceChildren();$('stats').replaceChildren();$('event-title').textContent='賽程表';$('empty').hidden=false;
 $('empty').textContent=cloudReady?(canEdit?'尚無賽程，請抽籤建立或匯入備份。':'尚未公布賽程。'):'正在讀取共用賽程…';
}
function persistLocal(){try{localStorage.setItem(KEY,JSON.stringify(state));status('已儲存於此瀏覽器')}catch{status('無法儲存，請匯出備份')}}
function ask(title,text,action){$('confirm-title').textContent=title;$('confirm-text').textContent=text;$('accept').onclick=()=>{$('confirm').close();action()};$('confirm').showModal()}
$('cancel').onclick=()=>$('confirm').close();
function label(n){return `${String(n).padStart(2,'0')} 號`}
function center(){const el=$('bracket').parentElement;el.scrollLeft=(el.scrollWidth-el.clientWidth)/2;el.scrollTop=0}
function renderPending(result){
 pendingMatches=Bracket.pending(result);if(!pendingMatches.some(m=>m.id===focusedMatch))focusedMatch='';
 $('pending-panel').hidden=false;$('pending-title').textContent=pendingMatches.length?`待打對局 · ${pendingMatches.length} 場`:'所有對局已完成';
 $('next-match').disabled=!pendingMatches.length;$('pending-list').replaceChildren();
 pendingMatches.forEach(m=>{
  const card=document.querySelector(`[data-match="${m.id}"]`),button=document.createElement('button');button.className='pending-choice';
  button.dataset.target=m.id;button.setAttribute('aria-controls',card.id);button.setAttribute('aria-pressed',String(m.id===focusedMatch));
  const caption=document.createElement('small'),players=document.createElement('span');caption.textContent=card.querySelector('.match-label').textContent;players.textContent=`${label(m.a.value)} × ${label(m.b.value)}`;
  button.append(caption,players);button.onclick=()=>focusMatch(m.id);$('pending-list').append(button);
 });
 document.querySelectorAll('.match').forEach(el=>el.classList.toggle('current-match',el.dataset.match===focusedMatch));
}
function focusMatch(id){
 if(!pendingMatches.some(m=>m.id===id))return;
 focusedMatch=id;document.querySelectorAll('.match').forEach(el=>el.classList.toggle('current-match',el.dataset.match===id));
 document.querySelectorAll('.pending-choice').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.target===id)));
 const card=document.getElementById(`match-${id}`),box=viewport.getBoundingClientRect(),rect=card.getBoundingClientRect(),behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
 viewport.scrollIntoView({behavior,block:'nearest'});viewport.scrollTo({left:viewport.scrollLeft+rect.left-box.left+(rect.width-viewport.clientWidth)/2,top:viewport.scrollTop+rect.top-box.top+(rect.height-viewport.clientHeight)/2,behavior});
 card.focus({preventScroll:true});
}
async function refreshCloud(){
 if(!cloudReady||refreshing||busy)return;refreshing=true;
 try{const row=await Cloud.load();if(!busy&&row&&row.revision>revision){state=Bracket.validate(row.payload);revision=row.revision;history=[];render()}if(!busy)status('已同步')}
 catch{status('連線中斷，稍後重試')}finally{refreshing=false}
}
async function updateAccess(){if(!cloudReady)return;try{canEdit=await Cloud.isAdmin();render()}catch{canEdit=false;render();status('無法確認登入狀態')}}
async function change(action,{undo=false}={}){
 if(!canEdit||busy)return;
 const before=state?JSON.stringify(state):null;busy=true;
 try{
  action();state=Bracket.validate(state);render();status(shared?'儲存中…':'儲存中…');
  if(shared){const next=await Cloud.save(state,revision);if(!Number.isSafeInteger(next)||next<=revision)throw Error('Invalid revision');revision=next;status('已同步')}
  else persistLocal();
  if(undo)history.pop();else if(before){history.push(before);if(history.length>100)history.shift()}
 }catch(error){
  state=before?JSON.parse(before):null;
  if(error.code==='40001'){busy=false;await refreshCloud();toast('另一台裝置已更新，已載入最新賽程，請重新操作。')}
  else {status('儲存失敗');toast('修改未儲存，已還原。請確認連線或重新登入。')}
 }finally{busy=false;render()}
}

function matchCard(m,caption){const card=document.createElement('div');card.className='match';card.dataset.match=m.id;card.id=`match-${m.id}`;card.tabIndex=-1;card.setAttribute('role','group');card.setAttribute('aria-label',caption);const cap=document.createElement('div');cap.className='match-label';cap.textContent=caption;card.append(cap);
 [m.a,m.b].forEach((slot,i)=>{const btn=document.createElement('button');btn.className='player';const name=document.createElement('span'),badge=document.createElement('span');badge.className='badge';name.textContent=slot.ready?(slot.value===null?'輪空':label(slot.value)):'待前場勝者';badge.textContent=m.auto&&slot.value!==null?'長籤晉級':m.winner!==null&&slot.value===m.winner?'✓ 勝出':'';btn.classList.toggle('winner',m.ready&&m.winner!==null&&slot.value===m.winner);btn.classList.toggle('loser',m.ready&&!m.auto&&slot.value!==m.winner);btn.disabled=!canEdit||busy||m.auto||!m.a.ready||!m.b.ready||slot.value===null;btn.setAttribute('aria-label',`${caption}，${name.textContent}${!btn.disabled?'，點選為勝者':''}`);btn.setAttribute('aria-pressed',String(m.winner!==null&&slot.value===m.winner));btn.append(name,badge);btn.onclick=()=>{if(m.winner!==slot.value)change(()=>Bracket.select(state,m.id,slot.value))};card.append(btn)});return card}
function render(){applyAccess(); if(!state){showEmpty();return;}$('empty').hidden=true;$('bracket').hidden=false;const result=Bracket.compute(state),rounds=result.rounds;document.title=`${state.title}｜晉級之路`;$('title').value=state.title;$('count').value=state.n;$('event-title').textContent=state.title;$('stats').replaceChildren();const total=state.n-1+(result.bronze?1:0),done=rounds.flat().filter(m=>m.ready&&!m.auto).length+(result.bronze?.ready?1:0);[`${state.n} 位參賽者`,`${state.slots.length-state.n} 支長籤`,'單淘汰',`${done} / ${total} 場完成`].forEach(t=>{const x=document.createElement('span');x.textContent=t;$('stats').append(x)});
 $('rounds').replaceChildren();rounds.forEach((matches,r)=>{const col=document.createElement('section');col.className='round';$('rounds').style.width=`${Math.max(900,rounds[0].length*188)}px`;const head=document.createElement('div');head.className='round-label';const remaining=rounds.length-r;head.textContent=remaining===1?'冠軍決定賽':remaining===2?'準決賽':remaining===3?'八強賽':`第 ${r+1} 輪`;const count=document.createElement('small');count.textContent=`${matches.length} 場`;head.append(count);const body=document.createElement('div');body.className='matches';matches.forEach((m,i)=>body.append(matchCard(m,`${remaining===1?'冠軍賽':remaining===2?'準決賽':`第 ${r+1} 輪`} · ${String(i+1).padStart(2,'0')}`)));col.append(head,body);$('rounds').append(col)});
 $('bronze').replaceChildren();if(result.bronze){$('bronze').hidden=false;$('bronze').append(matchCard(result.bronze,'三、四名決定賽'));}else $('bronze').hidden=true;renderPending(result);
 const final=rounds.at(-1)[0];$('podium').replaceChildren();[['冠軍',result.champion],['亞軍',final.ready?final.loser:null],['季軍',result.bronze?.ready?result.bronze.winner:null]].forEach(([rank,id])=>{const el=document.createElement('div');el.className='place';const small=document.createElement('small'),strong=document.createElement('strong');small.textContent=rank;strong.textContent=id?label(id):rank==='季軍'&&!result.bronze?'不適用':'待揭曉';el.append(small,strong);$('podium').append(el)});$('undo').disabled=busy||!history.length;$('clear').disabled=busy||!Object.keys(state.picks).length;requestAnimationFrame(()=>{connect();if(lastWidth!==$('rounds').style.width){lastWidth=$('rounds').style.width;center()}})}
function connect(){
 const root=$('bracket'),svg=$('lines'),result=Bracket.compute(state),rounds=result.rounds;
 const scale=1;root.style.zoom='1';
 const box=root.getBoundingClientRect();
 function rect(el){const b=el.getBoundingClientRect();return {left:(b.left-box.left)/scale,right:(b.right-box.left)/scale,top:(b.top-box.top)/scale,bottom:(b.bottom-box.top)/scale}}
 svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${root.offsetWidth} ${root.offsetHeight}`);
 function line(d,color,dashed=false){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('stroke',color);p.setAttribute('stroke-width','1.5');if(dashed)p.setAttribute('stroke-dasharray','4 4');svg.append(p)}
 rounds.slice(0,-1).forEach((matches,r)=>matches.forEach((m,i)=>{
  const a=rect(root.querySelector(`[data-match="${m.id}"]`)),b=rect(root.querySelector(`[data-match="r${r+1}m${Math.floor(i/2)}"]`));
  const x=(a.left+a.right)/2,y=a.top,ex=(b.left+b.right)/2,ey=b.bottom,mid=(y+ey)/2;
  line(`M ${x} ${y} V ${mid} H ${ex} V ${ey}`,m.ready?'#6c9067':'#cbd6c5');
 }));
 if(result.bronze){
  const semis=rounds.at(-2),a=rect(root.querySelector(`[data-match="${semis[0].id}"]`));
  $('bronze').style.left=`${root.offsetWidth/2-85}px`;$('bronze').style.top=`${a.top}px`;
  const bronze=rect($('bronze'));semis.forEach((m,i)=>{const a=rect(root.querySelector(`[data-match="${m.id}"]`)),y=(a.top+a.bottom)/2,x=i===0?a.right:a.left,ex=i===0?bronze.left:bronze.right;line(`M ${x} ${y} H ${ex}`,'#b4a36d',true)});
 }
}

$('view').onclick=center;
$('next-match').onclick=()=>{if(pendingMatches.length){const index=pendingMatches.findIndex(m=>m.id===focusedMatch);focusMatch(pendingMatches[(index+1)%pendingMatches.length].id)}};
$('draw').onclick=()=>{
 const n=Number($('count').value),title=$('title').value.trim()||'我的盃賽';
 if(!Number.isInteger(n)||n<2||n>128){toast('請輸入 2～128 之間的整數人數');$('count').focus();return}
 ask('重新抽籤？','將重新配置選手、長籤並清除賽果。',()=>change(()=>{state=Bracket.create(n,title)}));
};
$('title').onchange=()=>{const title=$('title').value.trim()||'我的盃賽';if(state&&title!==state.title)change(()=>{state.title=title})};
$('undo').onclick=()=>{if(history.length)change(()=>{state=JSON.parse(history.at(-1))},{undo:true})};
$('clear').onclick=()=>ask('清除賽果？','保留抽籤配置。',()=>change(()=>{state.picks={}}));
$('export').onclick=()=>{if(!state)return;const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`賽程備份-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('import').onclick=()=>{if(canEdit&&!busy)$('file').click()};
$('file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file||!canEdit||busy)return;try{if(file.size>200000)throw Error();const next=Bracket.validate(JSON.parse(await file.text()));ask('匯入備份？',`載入「${next.title}」並取代目前賽程。`,()=>change(()=>{state=next}))}catch{toast('請選擇有效的賽程 JSON 備份。')}};
$('migrate').onclick=()=>ask('公布本機賽程？','將這個瀏覽器原有的賽程與賽果上傳，讓所有人查看。',()=>change(()=>{state=Bracket.validate(localBackup)}));
$('print').onclick=()=>window.print();
$('login').onclick=()=>{if(!shared){toast('管理者登入與共用儲存尚未設定。');return}$('login-dialog').showModal()};
$('login-cancel').onclick=()=>$('login-dialog').close();
$('login-form').onsubmit=async e=>{e.preventDefault();$('send-login').disabled=true;try{await Cloud.login($('email').value.trim());$('login-message').textContent='若此信箱是已登錄的管理者，將收到登入連結，請至信箱開啟。'}catch{$('login-message').textContent='無法寄送，請確認信箱或稍後重試。'}finally{$('send-login').disabled=false}};
$('logout').onclick=async()=>{if(busy)return;try{await Cloud.logout();canEdit=false;history=[];render()}catch{toast('登出失敗，請稍後重試。')}};
const viewport=$('bracket').parentElement;let drag=null;
viewport.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button'))return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');e.preventDefault();
});
viewport.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id){viewport.scrollLeft=drag.left-(e.clientX-drag.x);viewport.scrollTop=drag.top-(e.clientY-drag.y)}});
function endDrag(){drag=null;viewport.classList.remove('dragging')}
viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);viewport.addEventListener('lostpointercapture',endDrag);
window.addEventListener('resize',()=>{if(state)requestAnimationFrame(connect)});window.addEventListener('beforeprint',()=>{if(state)connect()});window.addEventListener('afterprint',()=>{if(state)connect()});
window.addEventListener('focus',()=>{if(shared)refreshCloud()});
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue=''}});
render();
(async()=>{
 if(!shared){persistLocal();return}
 status('連線中…');
 try{await Cloud.initialize(updateAccess);cloudReady=true;await updateAccess();await refreshCloud();render();}
 catch{canEdit=false;status('無法連線');$('empty').hidden=false;$('empty').textContent='無法讀取共用賽程，請稍後重新整理。';applyAccess()}
 setInterval(()=>{if(!document.hidden)refreshCloud()},5000);
})();
