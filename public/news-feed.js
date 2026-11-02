export function feedState(source, now=Date.now()){
  if(!source?.items?.length)return {label:'Channel info',stale:false,available:false};
  const fetched=Date.parse(source.fetchedAt),latest=Date.parse(source.items[0]?.publishedAt);
  const stale=source.status!=='ok'||!Number.isFinite(fetched)||now-fetched>60*60*1000;
  return {label:stale?'Last available headlines':Number.isFinite(latest)&&now-latest>48*60*60*1000?'Latest published':'Latest headlines',stale,available:true};
}
export function relativeTime(value,now=Date.now()){
  const timestamp=Date.parse(value);if(!Number.isFinite(timestamp))return 'Time not supplied';
  const minutes=Math.max(0,Math.floor((now-timestamp)/60000));
  if(minutes<1)return 'Just published';if(minutes<60)return `${minutes}m ago`;
  if(minutes<1440)return `${Math.floor(minutes/60)}h ago`;
  return `${Math.floor(minutes/1440)}d ago`;
}
export function validStory(story){
  if(!story||typeof story.title!=='string'||!story.title.trim()||story.title.length>500)return false;
  try{const url=new URL(story.url);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function startNews({container,channels,makeElement,controls,status}){
  let sources={},byChannel=new Map(),rotation=0,inflight=false,disposed=false;
  let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause=controls.querySelector('#pause-news'),refresh=controls.querySelector('#refresh-news');
  pause.textContent=paused?'Resume headlines':'Pause headlines';pause.setAttribute('aria-pressed',String(paused));
  function updateSlots(animate=false){
    for(const slot of container.querySelectorAll('[data-news-channel]')){
      if(animate&&(slot.matches(':hover')||slot.contains(document.activeElement)))continue;
      const channel=channels().find(c=>c.id===slot.dataset.newsChannel);if(!channel)continue;
      const source=byChannel.get(channel.id),state=feedState(source),head=makeElement('div','news-heading');
      head.append(makeElement('span','news-label',state.label));
      const fragment=document.createDocumentFragment();fragment.append(head);
      slot.classList.toggle('news-stale',state.stale);
      if(state.available){
        const item=source.items[rotation%source.items.length];
        const link=makeElement('a','news-title',item.title);link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.dir='auto';
        const meta=makeElement('div','news-meta',`${source.name} · ${relativeTime(item.publishedAt)} · ${rotation%source.items.length+1}/${source.items.length}`);meta.title=`Feed fetched: ${source.fetchedAt||'unknown'}. This is a published news item, not the live TV schedule.`;
        fragment.append(link);if(item.summary){const summary=makeElement('p','news-summary',item.summary);summary.dir='auto';fragment.append(summary);}fragment.append(meta);
      }else{
        fragment.append(makeElement('p','news-summary',channel.description),makeElement('div','news-meta','Live program summary not provided'));
      }
      slot.replaceChildren(fragment);
      if(animate&&!paused){slot.classList.remove('news-change');void slot.offsetWidth;slot.classList.add('news-change');}
    }
  }
  async function load(manual=false){
    if(inflight||disposed)return;inflight=true;refresh.disabled=true;
    try{
      const response=await fetch(`./headlines.json?refresh=${Math.floor(Date.now()/300000)}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('Feed unavailable');const text=await response.text();if(text.length>400000)throw Error('Feed too large');const payload=JSON.parse(text);
      if(payload.kind!=='publisher-headlines'||!payload.sources||typeof payload.sources!=='object')throw Error('Invalid feed');
      if(disposed)return;sources=payload.sources;byChannel=new Map();
      for(const source of Object.values(sources)){
        if(!Array.isArray(source.channels)||!Array.isArray(source.items))continue;
        source.items=source.items.filter(validStory).slice(0,3);
        for(const id of source.channels)byChannel.set(id,source);
      }
      updateSlots();const count=channels().filter(c=>feedState(byChannel.get(c.id)).available).length;
      status.textContent=`${count} channels with headlines · feed refresh ~15 min`;
      status.title=`Snapshot generated: ${payload.generatedAt}. GitHub scheduled runs can be delayed. Headlines are not a TV program guide.`;
      if(manual)status.setAttribute('aria-live','polite');
    }catch{
      if(!disposed){updateSlots();status.textContent=byChannel.size?'Headline refresh unavailable · showing last received feed':'Headlines unavailable · channel information shown';}
    }finally{inflight=false;refresh.disabled=false;}
  }
  pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Resume headlines':'Pause headlines';pause.setAttribute('aria-pressed',String(paused));};
  refresh.onclick=()=>load(true);
  const observer=new MutationObserver(()=>updateSlots());observer.observe(container,{childList:true});
  const rotateTimer=setInterval(()=>{if(!paused&&!document.hidden){rotation++;updateSlots(true);}},10000);
  const refreshTimer=setInterval(()=>{if(!document.hidden)load();},300000);
  const visible=()=>{if(!document.hidden)load();};document.addEventListener('visibilitychange',visible);
  window.addEventListener('pagehide',()=>{disposed=true;clearInterval(rotateTimer);clearInterval(refreshTimer);observer.disconnect();document.removeEventListener('visibilitychange',visible);},{once:true});
  updateSlots();load();
}
