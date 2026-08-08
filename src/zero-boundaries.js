const KEY = "zero_boundary_state_v1";

const DEFAULT = {
  mode: "normal",        // normal | cold | away | wary
  pressure: 0,
  consecutive: 0,
  awaySince: 0,
  awayUntil: 0,
  severity: 0,
  ignoredWhileAway: 0,
  apologyAttempts: 0,
  lastDisrespectAt: 0,
};

const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,Number(n)||0));

export function loadBoundaryState(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||"null");
    return saved ? {...DEFAULT,...saved} : {...DEFAULT};
  }catch{
    return {...DEFAULT};
  }
}

export function saveBoundaryState(state){
  try{
    localStorage.setItem(KEY,JSON.stringify(state));
  }catch{}
}

export function obviousApology(text=""){
  const t=String(text).toLowerCase().trim();

  return /(désol|desol|pardon|excuse|my bad|sorry|maaf|ampun)/i.test(t);
}

export function updateBoundaryFromSignals(
  previous,
  {
    disrespect=0,
    interactionQuality=.4,
    humor=.1,
    userMessage="",
  }={}
){
  const now=Date.now();
  const d=clamp(disrespect);
  const q=clamp(interactionQuality);
  const h=clamp(humor);

  // Banter is less costly than sustained hostility.
  const banterRelief=
    h>.58 && q>.42 ? .24 : 0;

  const effective=
    clamp(d-banterRelief);

  let pressure=
    Math.max(
      0,
      Number(previous.pressure||0)*.88 +
      effective*.92 -
      q*.06
    );

  let consecutive=
    effective>.58
      ? Number(previous.consecutive||0)+1
      : effective>.34
        ? Math.max(1,Number(previous.consecutive||0))
        : 0;

  let mode=previous.mode||"normal";
  let awaySince=Number(previous.awaySince||0);
  let awayUntil=Number(previous.awayUntil||0);
  let severity=Number(previous.severity||0);

  if(mode!=="away"){
    if(
      (effective>.78 && consecutive>=2) ||
      pressure>.76 ||
      (effective>.62 && consecutive>=3)
    ){
      severity=clamp(
        .45 +
        pressure*.35 +
        consecutive*.06
      );

      // The worse it got, the longer Zero wants space.
      const minMs=
        14_000 +
        Math.round(severity*24_000);

      awaySince=now;
      awayUntil=now+minMs;
      mode="away";
    }else if(
      pressure>.44 ||
      consecutive>=2
    ){
      mode="cold";
    }else if(mode==="cold" && pressure<.28){
      mode="normal";
    }
  }

  return {
    ...previous,
    mode,
    pressure,
    consecutive,
    awaySince,
    awayUntil,
    severity,
    lastDisrespectAt:
      effective>.34
        ? now
        : previous.lastDisrespectAt,
  };
}

export function attemptReconcile(
  previous,
  text,
  language="fr"
){
  const now=Date.now();
  const apology=obviousApology(text);
  const remainingMs=
    Math.max(
      0,
      Number(previous.awayUntil||0)-now
    );

  const copy={
    fr:{
      no:[
        "j'ai pas envie de parler là. commence par t'excuser",
        "nan. si tu veux que je revienne commence par reconnaître que t'abuses",
        "là j'ai juste envie que tu me laisses tranquille. une excuse ça serait déjà mieux"
      ],
      weak:[
        "j'ai vu. laisse-moi un peu",
        "ok j'ai vu l'excuse. pas tout de suite",
        "hm. attends encore un peu"
      ],
      back:[
        "vas-y c'est bon",
        "ok. on repart",
        "viens c'est bon"
      ],
    },
    en:{
      no:[
        "I don't wanna talk right now. start with an apology",
        "nah. if you want me back, own what you did first",
        "I want space right now. an apology would be a start"
      ],
      weak:[
        "I saw it. give me a minute",
        "okay I saw the apology. not yet",
        "hm. give me a little longer"
      ],
      back:[
        "alright we're good",
        "okay. reset",
        "come on it's fine"
      ],
    },
    id:{
      no:[
        "gue lagi nggak mau ngobrol. mulai dari minta maaf dulu",
        "nah. kalau mau gue balik, akui dulu lu kelewatan",
        "gue pengen sendiri dulu. minta maaf dulu baru enak"
      ],
      weak:[
        "gue lihat. bentar dulu",
        "oke gue lihat maafnya. belum sekarang",
        "hmm. tunggu bentar lagi"
      ],
      back:[
        "yaudah gapapa",
        "oke. mulai lagi",
        "sini udah"
      ],
    },
  }[language] || null;

  if(!apology){
    const count=
      Number(previous.ignoredWhileAway||0);

    return {
      accepted:false,
      remainingMs,
      needsApology:true,
      state:{
        ...previous,
        ignoredWhileAway:count+1,
      },
      line:
        copy.no[
          count % copy.no.length
        ],
    };
  }

  const attempts=
    Number(previous.apologyAttempts||0)+1;

  const waitedEnough=
    remainingMs<=0;

  const severe=
    Number(previous.severity||0)>.72;

  const accepted=
    waitedEnough &&
    (!severe || attempts>=2);

  if(accepted){
    return {
      accepted:true,
      remainingMs:0,
      needsApology:false,
      state:{
        ...DEFAULT,
        mode:"wary",
        pressure:.16,
      },
      line:
        copy.back[
          Math.floor(Math.random()*copy.back.length)
        ],
    };
  }

  return {
    accepted:false,
    remainingMs,
    needsApology:false,
    state:{
      ...previous,
      apologyAttempts:attempts,
    },
    line:
      copy.weak[
        Math.floor(Math.random()*copy.weak.length)
      ],
  };
}

export function departureLine(language="fr", severity=.7){
  const lines={
    fr:
      severity>.78
        ? ["nan là tu me fatigues","jsuis pas là pour t'entendre gueuler comme ça","vas-y reviens quand t'es calmé"]
        : ["vas-y laisse tomber deux sec","nan là j'arrête","reviens quand t'es posé"],
    en:
      severity>.78
        ? ["nah you're tiring me out","I'm not here to get yelled at","come back when you've cooled off"]
        : ["alright leave it for a sec","nah I'm done for now","come back when you're chill"],
    id:
      severity>.78
        ? ["nah capek gue","gue bukan di sini buat dengerin lu ngamuk","balik lagi kalau udah tenang"]
        : ["udah bentar","nah gue stop dulu","balik kalau udah santai"],
  };

  const bank=lines[language]||lines.fr;
  return bank[Math.floor(Math.random()*bank.length)];
}
