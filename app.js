'use strict';
const $=id=>document.getElementById(id),KEY='bracket-club-v1';let state,history=[],toastTimer,fitView=true;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
try{const saved=localStorage.getItem(KEY);state=saved?Bracket.validate(JSON.parse(saved)):Bracket.create(15)}catch{state=Bracket.create(15);setTimeout(()=>toast('無法讀取原有資料，已建立新賽程。'),300)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('saved').textContent='✓ 已儲存在此瀏覽器'}catch{$('saved').textContent='儲存失敗，請匯出備份';toast('瀏覽器無法儲存，請匯出備份以保留進度。')}}
function remember(){history.push(JSON.stringify(state));if(history.length>100)history.shift()}
function ask(title,text,action){$('confirm-title').textContent=title;$('confirm-text').textContent=text;$('accept').onclick=()=>{$('confirm').close();action()};$('confirm').showModal()}
$('cancel').onclick=()=>$('confirm').close();
function label(n){return `${String(n).padStart(2,'0')} 號`}
function matchCard(m,caption){const card=document.createElement('div');card.className='match';card.dataset.match=m.id;const cap=document.createElement('div');cap.className='match-label';cap.textContent=caption;card.append(cap);
 [m.a,m.b].forEach((slot,i)=>{const btn=document.createElement('button');btn.className='player';const name=document.createElement('span'),badge=document.createElement('span');badge.className='badge';name.textContent=slot.ready?(slot.value===null?'輪空':label(slot.value)):'待前場勝者';badge.textContent=m.auto&&slot.value!==null?'長籤晉級':m.winner!==null&&slot.value===m.winner?'✓ 勝出':'';btn.classList.toggle('winner',m.ready&&m.winner!==null&&slot.value===m.winner);btn.classList.toggle('loser',m.ready&&!m.auto&&slot.value!==m.winner);btn.disabled=m.auto||!m.a.ready||!m.b.ready||slot.value===null;btn.setAttribute('aria-label',`${caption}，${name.textContent}${!btn.disabled?'，點選為勝者':''}`);btn.setAttribute('aria-pressed',String(m.winner!==null&&slot.value===m.winner));btn.append(name,badge);btn.onclick=()=>{if(m.winner===slot.value)return;remember();Bracket.select(state,m.id,slot.value);render();toast(`${label(slot.value)} ${m.id==='bronze'?'獲得季軍':'勝出晉級'}`)};card.append(btn)});return card}
function render(){const result=Bracket.compute(state),rounds=result.rounds;document.title=`${state.title}｜晉級之路`;$('title').value=state.title;$('count').value=state.n;$('event-title').textContent=state.title;$('stats').replaceChildren();const total=state.n-1+(result.bronze?1:0),done=rounds.flat().filter(m=>m.ready&&!m.auto).length+(result.bronze?.ready?1:0);[`${state.n} 位參賽者`,`${state.slots.length-state.n} 支長籤`,'單淘汰',`${done} / ${total} 場完成`].forEach(t=>{const x=document.createElement('span');x.textContent=t;$('stats').append(x)});
 $('rounds').replaceChildren();rounds.forEach((matches,r)=>{const col=document.createElement('section');col.className='round';$('rounds').style.width=`${Math.max(720,rounds[0].length*140)}px`;const head=document.createElement('div');head.className='round-label';const remaining=rounds.length-r;head.textContent=remaining===1?'冠軍決定賽':remaining===2?'準決賽':remaining===3?'八強賽':`第 ${r+1} 輪`;const count=document.createElement('small');count.textContent=`${matches.length} 場`;head.append(count);const body=document.createElement('div');body.className='matches';matches.forEach((m,i)=>body.append(matchCard(m,`${remaining===1?'冠軍賽':remaining===2?'準決賽':`第 ${r+1} 輪`} · ${String(i+1).padStart(2,'0')}`)));col.append(head,body);$('rounds').append(col)});
 $('bronze').replaceChildren();if(result.bronze){$('bronze').hidden=false;$('bronze').append(matchCard(result.bronze,'三、四名決定賽'));}else $('bronze').hidden=true;
 const final=rounds.at(-1)[0];$('podium').replaceChildren();[['冠軍',result.champion],['亞軍',final.ready?final.loser:null],['季軍',result.bronze?.ready?result.bronze.winner:null]].forEach(([rank,id])=>{const el=document.createElement('div');el.className='place';const small=document.createElement('small'),strong=document.createElement('strong');small.textContent=rank;strong.textContent=id?label(id):rank==='季軍'&&!result.bronze?'不適用':'待揭曉';el.append(small,strong);$('podium').append(el)});$('undo').disabled=!history.length;$('clear').disabled=!Object.keys(state.picks).length;persist();requestAnimationFrame(connect)}
function connect(){
 const root=$('bracket'),svg=$('lines'),result=Bracket.compute(state),rounds=result.rounds;
 root.style.zoom='1';const scroll=root.parentElement,style=getComputedStyle(scroll),available=scroll.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),scale=fitView?Math.min(1,available/root.offsetWidth):1;root.style.zoom=String(scale);
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
  $('bronze').style.left=`${root.offsetWidth/2-70}px`;$('bronze').style.top=`${a.top}px`;
  const bronze=rect($('bronze'));semis.forEach((m,i)=>{const a=rect(root.querySelector(`[data-match="${m.id}"]`)),y=(a.top+a.bottom)/2,x=i===0?a.right:a.left,ex=i===0?bronze.left:bronze.right;line(`M ${x} ${y} H ${ex}`,'#b4a36d',true)});
 }
}
$('view').onclick=()=>{fitView=!fitView;$('view').textContent=fitView?'放大檢視':'完整賽程';connect()};
$('draw').onclick=()=>{const n=Number($('count').value),title=$('title').value.trim()||'我的盃賽';if(!Number.isInteger(n)||n<2||n>128){toast('請輸入 2～128 之間的整數人數');$('count').focus();return}ask('重新抽籤？','將重新配置所有選手與長籤，並清除本次賽果。可使用「復原」回到原賽程。',()=>{remember();state=Bracket.create(n,title);render();toast('抽籤完成，點選選手開始晉級。')})};
$('title').onchange=()=>{const title=$('title').value.trim()||'我的盃賽';if(title!==state.title){remember();state.title=title;render()}};
$('undo').onclick=()=>{if(history.length){state=JSON.parse(history.pop());render();toast('已復原上一步')}};
$('clear').onclick=()=>ask('清除所有賽果？','保留目前抽籤配置，只清除手動選擇的勝者。',()=>{remember();state.picks={};render();toast('賽果已清除')});
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`賽程備份-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出賽程與賽果備份')};
$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>200000)throw Error('備份檔案太大');const next=Bracket.validate(JSON.parse(await file.text()));ask('匯入賽程備份？',`將載入「${next.title}」的 ${next.n} 人賽程，取代目前進度。`,()=>{remember();state=next;render();toast('備份已載入')})}catch{toast('無法匯入，請選擇由本網站匯出的有效 JSON 備份。')}};
$('print').onclick=()=>{if(state.slots.length>32)toast('大型賽程建議使用 A3 橫向並縮放列印。');window.print()};window.addEventListener('resize',()=>requestAnimationFrame(connect));window.addEventListener('beforeprint',connect);window.addEventListener('afterprint',connect);render();
