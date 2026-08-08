const KEY="zero_living_core_v1";
const clamp=(n)=>Math.max(0,Math.min(100,Number(n)||0));
const day=()=>new Date().toISOString().slice(0,10);

export function loadLivingCore(){
  const base={bond:4,curiosity:20,playUrge:24,sharedMoments:0,lastImpulseAt:0,lastInteractionAt:Date.now(),today:day(),recent:[],careXP:0,careLevel:1,careCoinsClaimed:0};
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||"null");
    if(!saved)return base;
    const v={...base,...saved};
    if(v.today!==day()){v.today=day();v.curiosity=clamp(v.curiosity+10);v.playUrge=clamp(v.playUrge+8);}
    return v;
  }catch{return base;}
}
export function saveLivingCore(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch{}}
export function recordLivingChat(v,s={}){
  const quality=Math.max(.15,Math.min(1,(Number(s.depth||.3)+Number(s.openness||.3)+Number(s.humor||.1))/1.7));
  return {...v,bond:clamp(v.bond+1.4+quality*2.6),curiosity:clamp(v.curiosity-2+Number(s.openness||0)*4),playUrge:clamp(v.playUrge+1+Number(s.humor||0)*3),sharedMoments:v.sharedMoments+1,lastInteractionAt:Date.now()};
}
export function recordLivingGame(v,result=""){
  return {...v,bond:clamp(v.bond+(result==="win"?3.8:3.1)),curiosity:clamp(v.curiosity+2),playUrge:clamp(v.playUrge-14),sharedMoments:v.sharedMoments+1,lastGameResult:result,lastInteractionAt:Date.now()};
}
const L={
 fr:{play:["eh viens jouer","viens on joue","att viens me battre","eh jveux ma revanche","nan viens jouer là"],talk:["eh j'ai un truc à te demander","att jpensais à un truc","viens j'ai une question","eh attends","j'ai un truc en tête là"]},
 en:{play:["yo come play","nah come play me","come on one game","yo I want my rematch","arcade. now."],talk:["yo I gotta ask you something","wait I was thinking about something","come here I got a question","hold on","I got something on my mind"]},
 id:{play:["eh ayo main","sini main dulu","ayo lawan gue","eh gue mau rematch","arcade bentar sini"],talk:["eh gue mau nanya sesuatu","bentar gue kepikiran sesuatu","sini gue ada pertanyaan","eh bentar","gue lagi kepikiran sesuatu"]}
};
const pick=a=>a[Math.floor(Math.random()*a.length)];
export function chooseZeroImpulse(v,language="fr",relationship=null){
  if(Date.now()-Number(v.lastImpulseAt||0)<75000)return null;
  const l=L[language]||L.fr;
  const games=Number(relationship?.gameProfile?.gamesPlayed||0);
  const p=.28+v.playUrge/190+Math.min(.14,games/100);
  let type=Math.random()<p?"play":"talk";
  if(v.recent?.slice(-2).every(x=>x===type))type=type==="play"?"talk":"play";
  return {id:String(Date.now()),type,text:pick(l[type])};
}
export function markImpulseShown(v,x){return {...v,lastImpulseAt:Date.now(),recent:[...(v.recent||[]),x.type].slice(-5)}}
export function livingCoreLabel(v,language="fr"){
 const n=Number(v.bond||0),i=n>=78?4:n>=48?3:n>=24?2:n>=10?1:0;
 const x={fr:["il t'observe","il te capte","il prend ses habitudes","vous avez vos délires","c'est vraiment ton Zero"],en:["he's observing you","he's getting you","he's building habits","you've got your own thing","this is really your Zero"],id:["dia lagi merhatiin kamu","dia mulai ngerti kamu","dia mulai punya kebiasaan","kalian udah punya vibe sendiri","ini beneran Zero kamu"]};
 return {label:(x[language]||x.fr)[i],progress:clamp(n)};
}
export function getCareProgress(v){
 const xp=Number(v.careXP||0);
 const level=Math.max(1,Math.floor(xp/80)+1);
 const inside=xp%80;
 return {level,xp,inside,needed:80,percent:(inside/80)*100,claimable:Math.max(0,(level-1)-Number(v.careCoinsClaimed||0))};
}
export function addCareXP(v,amount){
 const next={...v,careXP:Number(v.careXP||0)+Math.max(0,Number(amount)||0)};
 next.careLevel=getCareProgress(next).level;
 return next;
}
export function claimCareReward(v){
 const p=getCareProgress(v);
 if(p.claimable<=0)return {state:v,coins:0};
 const count=p.claimable;
 return {state:{...v,careCoinsClaimed:Number(v.careCoinsClaimed||0)+count},coins:count*35};
}
export function getZeroWants(v,language="fr"){
 const t={
 fr:{play:"il a envie de jouer",talk:"il veut te parler",chill:"il est posé",reward:"récompense prête"},
 en:{play:"he wants to play",talk:"he wants to talk",chill:"he's chilling",reward:"reward ready"},
 id:{play:"dia pengen main",talk:"dia mau ngobrol",chill:"dia lagi santai",reward:"hadiah siap"}
 };
 const c=t[language]||t.fr,p=getCareProgress(v);
 if(p.claimable>0)return {type:"reward",text:c.reward};
 if(Number(v.playUrge||0)>48)return {type:"play",text:c.play};
 if(Number(v.curiosity||0)>45)return {type:"talk",text:c.talk};
 return {type:"chill",text:c.chill};
}
