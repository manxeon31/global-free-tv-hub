import {startNews} from './news-feed.js?v=6';
import {filterChannels,playbackDecision,httpsUrl} from './policy.js?v=3';
import {loadYouTubeAPI,youtubeError} from './youtube-player.js?v=3';
const $=s=>document.querySelector(s);
let channels=[],selected=null,hls=null,youtube=null,generation=0,saved=[],selectionTrigger=null;
try{const raw=JSON.parse(localStorage.getItem('atlas-saved')||'[]');if(Array.isArray(raw))saved=raw.filter(x=>typeof x==='string');}catch{}
const state={query:'',country:'',language:'',category:'',savedOnly:false,playableOnly:false};
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function save(id){saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('atlas-saved',JSON.stringify(saved));}catch{$('#notice').textContent='Saved for this visit. Browser storage is unavailable.';$('#notice').hidden=false;}render();if(selected)$('#save-channel').textContent=saved.includes(selected.id)?'★ Saved channel':'☆ Save channel';}
function render(){
  const result=filterChannels(channels,{...state,saved});$('#grid').replaceChildren();
  const playable=result.filter(c=>playbackDecision(c).allowed).length;
  $('#result-count').textContent=`${result.length} channels · ${playable} with in-app player`;$('#empty').hidden=result.length>0;
  $('#saved-count').textContent=saved.filter(id=>channels.some(c=>c.id===id)).length;
  $('#saved-filter').setAttribute('aria-pressed',state.savedOnly);$('#playable-filter').setAttribute('aria-pressed',state.playableOnly);
  for(const c of result){
    const decision=playbackDecision(c),card=el('article','card'),art=el('div','card-art');art.style.setProperty('--art',c.color);
    art.append(el('div','art-pattern'),el('span','badge',decision.allowed?'▶ PLAY HERE':c.verification==='candidate'?'OFFICIAL SITE · CHECK PENDING':'OFFICIAL SITE'),el('span','wordmark',c.mark));
    const favorite=el('button','favorite',saved.includes(c.id)?'★':'☆');favorite.setAttribute('aria-label',`${saved.includes(c.id)?'Unsave':'Save'} ${c.name}`);favorite.setAttribute('aria-pressed',saved.includes(c.id));favorite.onclick=()=>save(c.id);art.append(favorite);
    const body=el('div','card-body'),news=el('div','card-news');news.dataset.newsChannel=c.id;body.append(el('h3','',c.name),el('p','meta',`${c.country} / ${c.language}`),news);
    const bottom=el('div','card-bottom'),open=el('button','',decision.allowed?'Watch here ▶':'Explore channel ↗');open.setAttribute('aria-label',`${decision.allowed?'Watch':'Explore'} ${c.name}`);open.onclick=()=>show(c,open);bottom.append(el('span','',c.category),open);body.append(bottom);card.append(art,body);$('#grid').append(card);
  }
}
function stop(){
  generation++;if(youtube){youtube.destroy();youtube=null;}if(hls){hls.destroy();hls=null;}
  $('#embed-wrap').replaceChildren();const video=$('#player');video.pause();video.removeAttribute('src');video.load();video.hidden=true;$('#player-wrap').hidden=true;$('#play').disabled=false;
}
function show(c,trigger){
  selectionTrigger=trigger;
  stop();selected=c;$('#detail-name').textContent=c.name;$('#detail-category').textContent=`${c.country} / ${c.category}`;$('#detail-description').textContent=c.description;
  const decision=playbackDecision(c);$('#detail-policy').textContent=decision.reason+(c.streamNote?' '+c.streamNote:'');
  const latest=$('#latest-stream');latest.hidden=!c.officialChannel;latest.href=c.officialChannel?c.officialChannel+'/live':c.officialUrl;
  $('#provider-consent').hidden=!decision.allowed||c.mode!=='youtube';
  $('#watch').href=httpsUrl(c.officialUrl)?c.officialUrl:'./sources.html';$('#play').hidden=!decision.allowed;$('#play').textContent=c.mode==='youtube'?'Load in-app player ▶':'Play approved feed ▶';
  $('#save-channel').textContent=saved.includes(c.id)?'★ Saved channel':'☆ Save channel';
  $('#detail-source').textContent=`Source review: ${c.reviewedAt}. ${c.mode==='youtube'?'Official broadcaster stream listed on YouTube. Live IDs and embedding availability can change; use the official site if playback fails.':c.verification==='page-verified'?'Official page inspected; playback depends on the broadcaster.':'Official-site candidate; automated page verification was unavailable.'}`;
  $('#watch-panel').hidden=false;
  $('#watch-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  if(decision.allowed) void $('#play').onclick();
}
$('#play').onclick=async()=>{
  const c=selected;if(!c||!playbackDecision(c).allowed)return;stop();const token=generation;
  $('#player-wrap').hidden=false;$('#play').disabled=true;const status=$('#player-status');status.textContent='Loading provider player…';
  const fail=message=>{if(token!==generation)return;status.textContent=`${message} You can still open the official source below.`;$('#play').disabled=false;$('#play').textContent='Retry player ▶';};
  if(c.mode==='youtube'){
    try{const YT=await loadYouTubeAPI();if(token!==generation)return;
      const mount=el('div');$('#embed-wrap').append(mount);
      youtube=new YT.Player(mount,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:c.videoId,playerVars:{playsinline:1,origin:location.origin,autoplay:0},events:{
        onReady:()=>{if(token!==generation)return;const iframe=youtube.getIframe();iframe.title=`${c.name} official YouTube player`;iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');status.textContent='Player ready. Press Play in the video. Availability is controlled by the broadcaster.';},
        onStateChange:event=>{if(token!==generation)return;if(event.data===1)status.textContent='Playing in Atlas · official broadcaster player';else if(event.data===0)status.textContent='This broadcast has ended. Visit the official source for the latest stream.';else if(event.data===2)status.textContent='Paused';else if(event.data===3)status.textContent='Buffering…';},
        onError:event=>fail(youtubeError(event.data))
      }});
    }catch(error){fail(error.message);}return;
  }
  const video=$('#player');video.hidden=false;const failHls=()=>fail('The stream may be offline, region restricted, or blocked by browser access rules.');video.onplaying=()=>{if(token===generation)status.textContent='Playing approved feed';};video.onerror=failHls;
  if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=c.streamUrl;video.play().catch(()=>{if(token===generation)status.textContent='Press Play in the video.';});}
  else if(window.Hls?.isSupported()){hls=new window.Hls({enableWorker:true,manifestLoadingMaxRetry:2,fragLoadingMaxRetry:2});hls.loadSource(c.streamUrl);hls.attachMedia(video);hls.on(window.Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>{if(token===generation)status.textContent='Press Play in the video.';}));hls.on(window.Hls.Events.ERROR,(_,data)=>{if(data.fatal){hls?.destroy();hls=null;failHls();}});}
  else fail('This browser does not support HLS playback.');
};
$('#save-channel').onclick=()=>selected&&save(selected.id);$('#close-player').onclick=()=>{stop();$('#watch-panel').hidden=true;if(selectionTrigger?.isConnected)selectionTrigger.focus();else $('#search').focus();};window.addEventListener('pagehide',stop);
$('#search').oninput=e=>{state.query=e.target.value;render();};
for(const field of ['country','language'])$('#'+field).onchange=e=>{state[field]=e.target.value;render();};
$('#saved-filter').onclick=()=>{state.savedOnly=!state.savedOnly;render();};$('#playable-filter').onclick=()=>{state.playableOnly=!state.playableOnly;render();};
$('#reset-filters').onclick=()=>{Object.assign(state,{query:'',country:'',language:'',category:'',savedOnly:false,playableOnly:false});$('#search').value='';$('#country').value='';$('#language').value='';for(const b of $('#categories').children)b.setAttribute('aria-pressed',b.dataset.category==='');render();};
$('#saved-nav').onclick=()=>{state.savedOnly=true;render();$('#explore').scrollIntoView();};
try{
  const response=await fetch('./catalog.json?v=8');if(!response.ok)throw Error('Catalog unavailable');const data=await response.json();channels=data.channels.filter(c=>httpsUrl(c.officialUrl));
  for(const field of ['country','language'])for(const value of [...new Set(channels.map(c=>c[field]))].sort()){const option=el('option','',value);option.value=value;$('#'+field).append(option);}
  for(const category of ['',...new Set(channels.map(c=>c.category))]){const b=el('button','',category||'All channels');b.dataset.category=category;b.setAttribute('aria-pressed',!category);b.onclick=()=>{state.category=category;for(const sibling of $('#categories').children)sibling.setAttribute('aria-pressed',sibling===b);render();};$('#categories').append(b);}render();
}catch{$('#result-count').textContent='Channel collection unavailable';$('#empty').hidden=false;$('#empty').textContent='We could not load the collection. Please refresh or try again later.';}

startNews({container:$("#grid"),channels:()=>channels,makeElement:el,controls:$("#news-controls"),status:$("#news-status")});
