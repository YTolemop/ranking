(function(root){
 'use strict';
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let r;const max=Math.floor(4294967296/(i+1))*(i+1);do{r=crypto.getRandomValues(new Uint32Array(1))[0]}while(r>=max);const j=r%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
 function create(n,title='我的盃賽'){
  if(!Number.isInteger(n)||n<2||n>128)throw Error('參賽人數須為 2～128 人');
  const size=2**Math.ceil(Math.log2(n)), people=shuffle(Array.from({length:n},(_,i)=>i+1));
  const pairs=shuffle(Array.from({length:size/2},(_,i)=>i)),slots=Array(size).fill(null);let p=0;
  pairs.forEach((pair,i)=>{slots[pair*2]=people[p++];if(i<n-size/2)slots[pair*2+1]=people[p++];else if(crypto.getRandomValues(new Uint32Array(1))[0]%2)[slots[pair*2],slots[pair*2+1]]=[null,slots[pair*2]]});
  return {version:1,title,n,slots,picks:{}};
 }
 function compute(s){
  let feed=s.slots.map(v=>({value:v,ready:true})),rounds=[],valid={};let r=0;
  function match(a,b,id){
   const signature=JSON.stringify([a.value,b.value]), pick=s.picks[id];
   let winner=null,ready=false,auto=false;
   if(a.ready&&b.ready){if(a.value===null||b.value===null){winner=a.value??b.value;ready=true;auto=true}
   else if(pick&&pick.signature===signature&&[a.value,b.value].includes(pick.winner)){winner=pick.winner;ready=true;valid[id]=pick}}
   return {id,a,b,winner,ready,auto,signature,loser:ready&&!auto?(winner===a.value?b.value:a.value):null};
  }
  while(feed.length>1){let matches=[];for(let i=0;i<feed.length;i+=2)matches.push(match(feed[i],feed[i+1],`r${r}m${i/2}`));rounds.push(matches);feed=matches.map(m=>({value:m.winner,ready:m.ready}));r++}
  let bronze=null;if(s.n>=4){const semis=rounds[rounds.length-2];bronze=match({value:semis[0].loser,ready:semis[0].ready},{value:semis[1].loser,ready:semis[1].ready},'bronze')}
  s.picks=valid;return {rounds,bronze,champion:feed[0].ready?feed[0].value:null};
 }
 function select(s,id,winner){const result=compute(s),m=[...result.rounds.flat(),result.bronze].find(m=>m&&m.id===id);if(!m||m.auto||!m.a.ready||!m.b.ready||![m.a.value,m.b.value].includes(winner))throw Error('此場次尚無法選擇');s.picks[id]={winner,signature:m.signature};return compute(s)}
 function validate(raw){if(!raw||raw.version!==1||!Number.isInteger(raw.n)||raw.n<2||raw.n>128||typeof raw.title!=='string'||raw.title.length>80||!Array.isArray(raw.slots)||raw.slots.length!==2**Math.ceil(Math.log2(raw.n)))throw Error('備份格式不正確');const ids=raw.slots.filter(v=>v!==null).sort((a,b)=>a-b);if(ids.length!==raw.n||ids.some((v,i)=>v!==i+1))throw Error('選手編號不完整');for(let i=0;i<raw.slots.length;i+=2)if(raw.slots[i]===null&&raw.slots[i+1]===null)throw Error('長籤配置不正確');const clean={version:1,title:raw.title,n:raw.n,slots:[...raw.slots],picks:{}};if(raw.picks&&typeof raw.picks==='object')for(const [k,v] of Object.entries(raw.picks))if(/^(r\d+m\d+|bronze)$/.test(k)&&v&&typeof v.signature==='string'&&Number.isInteger(v.winner))clean.picks[k]={signature:v.signature,winner:v.winner};compute(clean);return clean}
 function pending(result){return [...result.rounds.flat(),result.bronze].filter(m=>m&&!m.ready&&!m.auto&&m.a.ready&&m.b.ready&&m.a.value!==null&&m.b.value!==null)}
 const api={create,compute,select,validate,pending};if(typeof module!=='undefined')module.exports=api;else root.Bracket=api;
})(globalThis);
