import {startNews} from './news-feed.js?v=6';
import {filterChannels,playbackDecision,httpsUrl} from './policy.js?v=3';
import {createCardPlayer} from './card-player.js?v=9';
const $=s=>document.querySelector(s);
let channels=[],saved=[];const cards=new Map();
try{const raw=JSON.parse(localStorage.getItem('atlas-saved')||'[]');if(Array.isArray(raw))saved=raw.filter(x=>typeof x==='string');}catch{}
const state={query:'',country:'',language:'',category:'',savedOnly:false,playableOnly:false};
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function message(text){$('#notice').textContent=text;$('#notice').hidden=false;clearTimeout(message.timer);message.timer=setTimeout(()=>$('#notice').hidden=true,3500);}
const player=createCardPlayer({dock:$('#player-dock'),wrapper:$('#player-wrap'),video:$('#player'),embed:$('#embed-wrap'),status:$('#player-status')});
function play(c){if(!playbackDecision(c).allowed){message('This channel is available at its official source.');return;}player.start(c,cards.get(c.id));}
function save(id){saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('atlas-saved',JSON.stringify(saved));}catch{message('Saved for this visit. Browser storage is unavailable.');}render();}
function sourceLink(url,label,cls=''){const a=el('a',cls,label);a.href=httpsUrl(url)?url:'./sources.html';a.target='_blank';a.rel='noopener noreferrer';return a;}
function createCard(c){
  const playable=playbackDecision(c).allowed,card=el('article','card'),art=el('div','card-art');card.dataset.channelId=c.id;art.style.setProperty('--art',c.color);
  art.append(el('div','art-pattern'),el('span','badge',playable?'▶ PLAY IN THUMBNAIL':c.verification==='candidate'?'OFFICIAL SITE · CHECK PENDING':'OFFICIAL SITE'),el('span','wordmark',c.mark));
  let thumbnail;
  if(playable){thumbnail=el('button','thumbnail-play');thumbnail.setAttribute('aria-label',`Play ${c.name} in thumbnail`);thumbnail.onclick=()=>play(c);}
  else{thumbnail=sourceLink(c.officialUrl,'','thumbnail-play');thumbnail.setAttribute('aria-label',`Open ${c.name} official source`);}
  thumbnail.append(el('span','',playable?'▶ Play here':'Official source ↗'));art.append(thumbnail);
  const favorite=el('button','favorite');favorite.onclick=()=>save(c.id);art.append(favorite,el('div','card-video'));
  const tools=el('div','player-tools');const expand=el('button','expand-player','Expand player ↗');expand.setAttribute('aria-expanded','false');expand.setAttribute('aria-label',`Expand ${c.name} player`);expand.onclick=()=>{player.expand();expand.setAttribute('aria-label',card.classList.contains('is-expanded')?`Collapse ${c.name} player`:`Expand ${c.name} player`);};
  const stop=el('button','stop-player','Stop ×');stop.setAttribute('aria-label',`Stop ${c.name} player`);stop.onclick=()=>{player.stop();thumbnail.focus();};tools.append(expand,stop);
  const body=el('div','card-body'),news=el('div','card-news');news.dataset.newsChannel=c.id;
  body.append(el('h3','',c.name),el('p','meta',`${c.country} / ${c.language}`));
  const details=el('div','stream-details');details.append(el('p','',c.streamNote||'Official broadcaster player. Provider ads and regional availability apply.'));
  details.append(el('p','','Loading this player connects to YouTube. Press Play inside the video to begin.'));
  const links=el('div','stream-links');links.append(sourceLink(c.officialUrl,'Official source ↗'));if(c.officialChannel)links.append(sourceLink(c.officialChannel+'/live','Latest broadcast ↗'));details.append(links);body.append(details,news);
  const bottom=el('div','card-bottom');let open;
  if(playable){open=el('button','','Watch here ▶');open.setAttribute('aria-label',`Watch ${c.name}`);open.onclick=()=>play(c);}
  else open=sourceLink(c.officialUrl,'Watch at source ↗');bottom.append(el('span','',c.category),open);body.append(bottom);card.append(art,tools,body);return card;
}
function render(){
  const result=filterChannels(channels,{...state,saved}),visible=new Set(result.map(c=>c.id));
  if(player.activeId()&&!visible.has(player.activeId()))player.stop();
  for(const c of channels){
    if(!cards.has(c.id)){const card=createCard(c);cards.set(c.id,card);$('#grid').append(card);}
    const card=cards.get(c.id);card.hidden=!visible.has(c.id);const favorite=card.querySelector('.favorite');const isSaved=saved.includes(c.id);favorite.textContent=isSaved?'★':'☆';favorite.setAttribute('aria-label',`${isSaved?'Unsave':'Save'} ${c.name}`);favorite.setAttribute('aria-pressed',String(isSaved));
  }
  const playable=result.filter(c=>playbackDecision(c).allowed).length;
  $('#result-count').textContent=`${result.length} ${result.length===1?'channel':'channels'} · ${playable} with in-app player`;$('#empty').hidden=result.length>0;
  $('#saved-count').textContent=saved.filter(id=>channels.some(c=>c.id===id)).length;$('#saved-filter').setAttribute('aria-pressed',String(state.savedOnly));$('#playable-filter').setAttribute('aria-pressed',String(state.playableOnly));
}
$('#search').oninput=e=>{state.query=e.target.value;render();};
for(const field of ['country','language'])$('#'+field).onchange=e=>{state[field]=e.target.value;render();};
$('#saved-filter').onclick=()=>{state.savedOnly=!state.savedOnly;render();};$('#playable-filter').onclick=()=>{state.playableOnly=!state.playableOnly;render();};
$('#reset-filters').onclick=()=>{Object.assign(state,{query:'',country:'',language:'',category:'',savedOnly:false,playableOnly:false});$('#search').value='';$('#country').value='';$('#language').value='';for(const b of $('#categories').children)b.setAttribute('aria-pressed',String(b.dataset.category===''));render();};
$('#saved-nav').onclick=()=>{state.savedOnly=true;render();$('#explore').scrollIntoView();};
try{
  const response=await fetch('./catalog.json?v=8');if(!response.ok)throw Error('Catalog unavailable');const data=await response.json();channels=data.channels.filter(c=>httpsUrl(c.officialUrl));
  for(const field of ['country','language'])for(const value of [...new Set(channels.map(c=>c[field]))].sort()){const option=el('option','',value);option.value=value;$('#'+field).append(option);}
  for(const category of ['',...new Set(channels.map(c=>c.category))]){const b=el('button','',category||'All channels');b.dataset.category=category;b.setAttribute('aria-pressed',String(!category));b.onclick=()=>{state.category=category;for(const sibling of $('#categories').children)sibling.setAttribute('aria-pressed',String(sibling===b));render();};$('#categories').append(b);}render();
}catch{$('#result-count').textContent='Channel collection unavailable';$('#empty').hidden=false;$('#empty').textContent='We could not load the collection. Please refresh or try again later.';}
startNews({container:$('#grid'),channels:()=>channels,makeElement:el,controls:$('#news-controls'),status:$('#news-status')});
