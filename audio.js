/* ═══════════════════════════════════════════════════════
   夜巡 ・ 程序生成配樂（Web Audio，零外部檔案、零版權）
   五聲音階（宮商角徵羽）＋ 低音 drone ＋ 磬聲 ＋ 打字音
   ═══════════════════════════════════════════════════════ */
const Audio7 = (()=>{
  let ctx=null, master=null, musicGain=null, sfxGain=null;
  let started=false, loopTimer=null, droneNodes=[], on=true;
  let mood='night';

  /* 五聲音階（羽調式，聽起來最「古」）：A C D E G */
  const SCALES={
    night:  [220.00,261.63,293.66,329.63,392.00],            // 低沉、懸疑
    history:[196.00,233.08,261.63,293.66,349.23],            // 更沉、悲
    warm:   [261.63,293.66,329.63,392.00,440.00],            // 明亮、溫暖
    tense:  [207.65,246.94,277.18,311.13,369.99]             // 半音下移、不安
  };
  const DRONE={night:110,history:98,warm:130.81,tense:103.83};

  function init(){
    if(ctx)return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    ctx=new AC();
    master=ctx.createGain(); master.gain.value=0.0; master.connect(ctx.destination);
    musicGain=ctx.createGain(); musicGain.gain.value=0.55; musicGain.connect(master);
    sfxGain=ctx.createGain();   sfxGain.gain.value=0.85;  sfxGain.connect(master);
  }

  /* 簡易殘響：多抽頭延遲 */
  function reverb(input,out,amount=0.3){
    const d1=ctx.createDelay(1.2),d2=ctx.createDelay(1.2),fb=ctx.createGain(),wet=ctx.createGain();
    d1.delayTime.value=0.19; d2.delayTime.value=0.31; fb.gain.value=0.34; wet.gain.value=amount;
    input.connect(d1); d1.connect(d2); d2.connect(fb); fb.connect(d1);
    d2.connect(wet); wet.connect(out);
  }

  /* 撥弦（古箏感）：短促觸發 + 快速衰減 */
  function pluck(freq,t,vol=0.16,dur=2.4){
    if(!ctx)return;
    const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type='triangle'; o.frequency.value=freq;
    f.type='lowpass'; f.frequency.setValueAtTime(2600,t); f.frequency.exponentialRampToValueAtTime(600,t+dur);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(f); f.connect(g); g.connect(musicGain); reverb(g,musicGain,0.32);
    o.start(t); o.stop(t+dur+0.05);
    // 泛音，讓音色更像絃
    const o2=ctx.createOscillator(),g2=ctx.createGain();
    o2.type='sine'; o2.frequency.value=freq*2.01;
    g2.gain.setValueAtTime(0,t);
    g2.gain.linearRampToValueAtTime(vol*0.3,t+0.008);
    g2.gain.exponentialRampToValueAtTime(0.0001,t+dur*0.5);
    o2.connect(g2); g2.connect(musicGain);
    o2.start(t); o2.stop(t+dur*0.55);
  }

  /* 低音 drone */
  function startDrone(){
    stopDrone();
    const base=DRONE[mood]||110;
    [[base,0.055],[base*1.5,0.022],[base*2,0.014]].forEach(([f,v])=>{
      const o=ctx.createOscillator(),g=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0,ctx.currentTime);
      g.gain.linearRampToValueAtTime(v,ctx.currentTime+3.5);
      lfo.frequency.value=0.07+Math.random()*0.05; lg.gain.value=v*0.35;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(musicGain);
      o.start(); lfo.start();
      droneNodes.push(o,lfo,g);
    });
  }
  function stopDrone(){
    droneNodes.forEach(n=>{try{n.stop&&n.stop();}catch(e){}});
    droneNodes=[];
  }

  /* 隨機琶音循環 */
  function schedule(){
    if(!ctx||!on)return;
    const sc=SCALES[mood]||SCALES.night;
    const now=ctx.currentTime;
    const bars=4, beat=1.15;
    for(let i=0;i<bars;i++){
      if(Math.random()<0.72){
        const oct=Math.random()<0.28?2:1;
        const n=sc[Math.floor(Math.random()*sc.length)]*oct;
        pluck(n, now+i*beat+Math.random()*0.18, 0.10+Math.random()*0.07, 2.2+Math.random()*1.6);
      }
      if(Math.random()<0.22){
        const n=sc[Math.floor(Math.random()*sc.length)]*0.5;
        pluck(n, now+i*beat+0.5, 0.07, 3.4);
      }
    }
    loopTimer=setTimeout(schedule, bars*beat*1000);
  }

  return {
    start(){
      init(); if(!ctx||started)return;
      started=true;
      if(ctx.state==='suspended')ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value,ctx.currentTime);
      master.gain.linearRampToValueAtTime(on?0.9:0,ctx.currentTime+2.5);
      startDrone(); schedule();
    },
    setMood(m){
      if(!ctx||mood===m)return;
      mood=m;
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setValueAtTime(musicGain.gain.value,ctx.currentTime);
      musicGain.gain.linearRampToValueAtTime(0.05,ctx.currentTime+1.0);
      setTimeout(()=>{
        if(!ctx)return;
        startDrone();
        musicGain.gain.linearRampToValueAtTime(0.55,ctx.currentTime+1.6);
      },1050);
    },
    toggle(){
      on=!on;
      if(!ctx)return on;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value,ctx.currentTime);
      master.gain.linearRampToValueAtTime(on?0.9:0,ctx.currentTime+0.6);
      return on;
    },
    isOn(){return on;},

    /* 打字音：極輕的木質點擊 */
    tick(){
      if(!ctx||!on)return;
      const t=ctx.currentTime;
      const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
      o.type='square'; o.frequency.value=1400+Math.random()*500;
      f.type='bandpass'; f.frequency.value=2200; f.Q.value=3;
      g.gain.setValueAtTime(0.028,t);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.022);
      o.connect(f); f.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t+0.03);
    },
    /* 磬／鐘 */
    chime(freq=523.25,vol=0.22){
      if(!ctx||!on)return;
      const t=ctx.currentTime;
      [1,2.76,5.4].forEach((r,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine'; o.frequency.value=freq*r;
        const v=vol/(i+1.6);
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(v,t+0.006);
        g.gain.exponentialRampToValueAtTime(0.0001,t+3.2/(i*0.5+1));
        o.connect(g); g.connect(sfxGain); reverb(g,sfxGain,0.4);
        o.start(t); o.stop(t+3.4);
      });
    },
    /* 低沉撞擊（震動、衝突） */
    thud(){
      if(!ctx||!on)return;
      const t=ctx.currentTime;
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(38,t+0.5);
      g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.6);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t+0.65);
      // 噪音層
      const n=ctx.createBufferSource(),buf=ctx.createBuffer(1,ctx.sampleRate*0.3,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
      n.buffer=buf;
      const ng=ctx.createGain(); ng.gain.value=0.12;
      const nf=ctx.createBiquadFilter(); nf.type='lowpass'; nf.frequency.value=400;
      n.connect(nf); nf.connect(ng); ng.connect(sfxGain); n.start(t);
    },
    /* 骰子落桌 */
    roll(){
      if(!ctx||!on)return;
      for(let i=0;i<4;i++){
        setTimeout(()=>{
          if(!ctx)return;
          const t=ctx.currentTime;
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.type='triangle'; o.frequency.value=260+Math.random()*180;
          g.gain.setValueAtTime(0.09,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
          o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t+0.1);
        }, i*95+Math.random()*40);
      }
    }
  };
})();
