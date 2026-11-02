import {mkdir,cp,access,writeFile} from 'node:fs/promises';
const preview=process.argv.includes('--preview');
if(!preview) await access('node_modules/hls.js/dist/hls.min.js');
await mkdir('dist/vendor',{recursive:true});
await cp('public','dist',{recursive:true});
if(preview){await writeFile('dist/vendor/hls.min.js','console.warn("Preview only: HLS.js unavailable; direct MSE playback is not validated.");');}
else{await cp('node_modules/hls.js/dist/hls.min.js','dist/vendor/hls.min.js');await cp('node_modules/hls.js/LICENSE','dist/vendor/HLS-LICENSE.txt');}
console.log(preview?'Built directory-only preview in dist/; not a production build':'Built static app in dist/');
