import {loadYouTubeAPI,youtubeError} from './youtube-player.js?v=3';
export function createCardPlayer({dock,wrapper,video,embed,status,onStop}){
  let youtube=null,hls=null,generation=0,card=null,channel=null;
  function stop(){
    generation++;
    if(youtube){youtube.destroy();youtube=null;}if(hls){hls.destroy();hls=null;}
    video.pause();video.removeAttribute('src');video.load();video.hidden=true;embed.replaceChildren();wrapper.hidden=true;dock.append(wrapper);
    if(card){card.classList.remove('is-playing','is-expanded');const expand=card.querySelector('.expand-player');expand.textContent='Expand player ↗';expand.setAttribute('aria-expanded','false');expand.setAttribute('aria-label',`Expand ${channel.name} player`);}
    card=null;channel=null;onStop?.();
  }
  async function start(nextChannel,nextCard){
    if(channel?.id===nextChannel.id)return;
    stop();channel=nextChannel;card=nextCard;const token=generation;
    card.classList.add('is-playing');card.querySelector('.card-video').append(wrapper);wrapper.hidden=false;status.textContent='Loading provider player…';
    const fail=message=>{if(token===generation)status.textContent=message+' Try the official source below.';};
    if(channel.mode==='youtube'){
      try{const YT=await loadYouTubeAPI();if(token!==generation)return;const mount=document.createElement('div');embed.append(mount);
        youtube=new YT.Player(mount,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:channel.videoId,playerVars:{playsinline:1,origin:location.origin,autoplay:0},events:{
          onReady:event=>{if(token!==generation)return;const frame=event.target.getIframe();frame.title=`${nextChannel.name} official YouTube player`;frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');status.textContent='Press Play in the video · Expand for a larger view';},
          onStateChange:event=>{if(token!==generation)return;if(event.data===1)status.textContent='Playing · official broadcaster player';else if(event.data===2)status.textContent='Paused';else if(event.data===3)status.textContent='Buffering…';else if(event.data===0)status.textContent='Broadcast ended · use the latest official broadcast link';},
          onError:event=>fail(youtubeError(event.data))
        }});
      }catch(error){fail(error.message);}return;
    }
    video.hidden=false;
    video.onplaying=()=>{if(token===generation)status.textContent='Playing approved feed';};video.onerror=()=>fail('This feed cannot play here.');
    if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=nextChannel.streamUrl;video.play().catch(()=>{if(token===generation)status.textContent='Press Play in the video';});}
    else if(window.Hls?.isSupported()){hls=new window.Hls({enableWorker:true,manifestLoadingMaxRetry:2,fragLoadingMaxRetry:2});hls.loadSource(nextChannel.streamUrl);hls.attachMedia(video);hls.on(window.Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>{}));hls.on(window.Hls.Events.ERROR,(_,data)=>{if(data.fatal){hls?.destroy();hls=null;fail('The stream is unavailable.');}});}
    else fail('This browser does not support HLS video.');
  }
  function expand(){if(!card)return;const expanded=card.classList.toggle('is-expanded');const button=card.querySelector('.expand-player');button.textContent=expanded?'Back to thumbnail ↙':'Expand player ↗';button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',`${expanded?'Collapse':'Expand'} ${channel.name} player`);if(expanded)card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  window.addEventListener('pagehide',stop);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&card?.classList.contains('is-expanded')&&!document.fullscreenElement)expand();});
  return {start,stop,expand,activeId:()=>channel?.id};
}
