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
 fr:{play:["eh viens jouer","viens on joue","att viens me battre","eh jveux ma revanche","nan viens jouer là"],talk:["att jveux ton avis sur un truc","eh jviens de penser à un truc","att réponds-moi à ça","viens deux sec jveux savoir un truc","eh j'ai repensé à un truc"]},
 en:{play:["yo come play","nah come play me","come on one game","yo I want my rematch","arcade. now."],talk:["wait I want your take on something","yo I just thought of something","answer me this real quick","come here I wanna know something","wait I remembered something"]},
 id:{play:["eh ayo main","sini main dulu","ayo lawan gue","eh gue mau rematch","arcade bentar sini"],talk:["bentar gue mau tau pendapat lu","eh gue baru kepikiran sesuatu","jawab ini bentar","sini gue pengen tau sesuatu","bentar gue keinget sesuatu"]}
};
const pick=a=>a[Math.floor(Math.random()*a.length)];
export function chooseZeroImpulse(v,language="fr",relationship=null){
  if(Date.now()-Number(v.lastImpulseAt||0)<75000)return null;

  const energy=
    Number(relationship?.totalEnergy||0);

  const games=[
    ["tictactoe",0],
    ["reflex",0],
    ["rps",5],
    ["connect4",18],
    ["memory",32],
    ["tapduel",48],
    ["secret",72],
    ["codebreaker",105],
  ].filter(([,unlock])=>energy>=unlock);

  const gameNames={
    fr:{
      tictactoe:"morpion",
      reflex:"réflexes",
      rps:"pierre feuille ciseaux",
      connect4:"puissance 4",
      memory:"mémoire",
      tapduel:"tap duel",
      secret:"nombre secret",
      codebreaker:"codebreaker",
    },
    en:{
      tictactoe:"tic tac toe",
      reflex:"reflex",
      rps:"rock paper scissors",
      connect4:"connect four",
      memory:"memory",
      tapduel:"tap duel",
      secret:"secret number",
      codebreaker:"codebreaker",
    },
    id:{
      tictactoe:"tic tac toe",
      reflex:"refleks",
      rps:"batu gunting kertas",
      connect4:"connect four",
      memory:"memory",
      tapduel:"tap duel",
      secret:"angka rahasia",
      codebreaker:"codebreaker",
    }
  };

  const l=L[language]||L.fr;
  const p=.28+v.playUrge/190+Math.min(.14,Number(relationship?.gameProfile?.gamesPlayed||0)/100);

  let type=Math.random()<p?"play":"talk";

  if(v.recent?.slice(-2).every(x=>x===type)){
    type=type==="play"?"talk":"play";
  }

  if(type==="play"){
    const picked=
      games[Math.floor(Math.random()*games.length)]?.[0] ||
      "tictactoe";

    const name=
      (gameNames[language]||gameNames.fr)[picked];

    const variants={
      fr:[
        `eh viens ${name}`,
        `viens on fait ${name}`,
        `att viens me battre à ${name}`,
        `jveux ma revanche à ${name}`,
      ],
      en:[
        `yo come play ${name}`,
        `come on ${name}`,
        `come beat me at ${name}`,
        `I want my ${name} rematch`,
      ],
      id:[
        `eh ayo ${name}`,
        `sini main ${name}`,
        `ayo lawan gue di ${name}`,
        `gue mau rematch ${name}`,
      ],
    };

    const bank=variants[language]||variants.fr;

    return {
      id:String(Date.now()),
      type:"play",
      gameId:picked,
      text:pick(bank),
    };
  }

  return {
    id:String(Date.now()),
    type:"talk",
    text:pick(l.talk),
  };
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
