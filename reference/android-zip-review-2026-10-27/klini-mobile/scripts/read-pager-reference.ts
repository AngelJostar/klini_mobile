import { chromium } from '@playwright/test';
import {readFileSync} from 'node:fs';
async function main(){const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:1100,height:720}});
await p.setContent('<div id="frames" style="display:flex;gap:5px"></div><video id="v" muted style="display:none"></video>');
await p.evaluate(async data=>{const v=document.getElementById('v') as HTMLVideoElement;v.src=data;await new Promise(r=>v.onloadeddata=r);for(const t of [0.1,1.4,2.5,3.4,4.8]){v.currentTime=t;await new Promise(r=>v.onseeked=r);const c=document.createElement('canvas');c.width=210;c.height=650;c.getContext('2d')!.drawImage(v,0,0,c.width,c.height);document.getElementById('frames')!.appendChild(c);}},'data:video/mp4;base64,'+readFileSync('C:/Users/Guillermo/Desktop/MouseWithoutBorders/Klini_deslizamiento_corregido_5s.mp4').toString('base64'));
await p.screenshot({path:'test-results/pager-reference.png'});await b.close();

}main().catch(console.error);
