// Fixed discovery endpoints only. Never fetch channel URLs or publish candidates automatically.
import {mkdir,writeFile} from 'node:fs/promises';
import {parseM3U} from './m3u.mjs';
const sources={channels:'https://iptv-org.github.io/api/channels.json',feeds:'https://iptv-org.github.io/api/feeds.json',streams:'https://iptv-org.github.io/api/streams.json',blocklist:'https://iptv-org.github.io/api/blocklist.json',freeTV:'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8'};
await mkdir('work/imports',{recursive:true});
const report={fetchedAt:new Date().toISOString(),sources:{},candidates:[],errors:[]};
async function fetchBounded(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error'});if(!r.ok)throw Error(`HTTP ${r.status}`);const reader=r.body.getReader();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>25_000_000)throw Error('Source exceeds 25 MB');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}return Buffer.concat(chunks).toString('utf8');}
for(const [key,url] of Object.entries(sources)){try{const text=await fetchBounded(url);const data=key==='freeTV'?parseM3U(text):JSON.parse(text);if(!Array.isArray(data))throw Error('Expected array');report.sources[key]={url,count:data.length};if(key==='freeTV')report.candidates=data.map(c=>({...c,source:url,rights:'pending',mode:'external'}));await writeFile(`work/imports/${key}.json`,JSON.stringify(data,null,2));}catch(e){report.errors.push({source:key,error:e.message});}}
await writeFile('work/imports/report.json',JSON.stringify(report,null,2));
console.log(`Discovery complete: ${report.candidates.length} Free-TV candidates; ${report.errors.length} source errors. Nothing published.`);if(report.errors.length)process.exitCode=1;
