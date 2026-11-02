let apiPromise;
export function loadYouTubeAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(apiPromise)return apiPromise;
  apiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
    const timeout=setTimeout(()=>{script.remove();apiPromise=null;reject(new Error('Player took too long to load.'));},15000);
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve(window.YT);};
    script.onerror=()=>{clearTimeout(timeout);script.remove();apiPromise=null;reject(new Error('YouTube could not load on this connection.'));};
    document.head.append(script);
  });return apiPromise;
}
export function youtubeError(code){return ({2:'The broadcaster stream reference is invalid.',5:'This browser could not play the stream.',100:'This stream has ended or is unavailable.',101:'The broadcaster has disabled embedded playback.',150:'The broadcaster has disabled embedded playback.',153:'YouTube could not verify this player’s website. Try a normal browser or the official source.'})[code]||'The provider could not play this stream in your browser or region.';}
