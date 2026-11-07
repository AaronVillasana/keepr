import http from 'node:http';
import {readFileSync,existsSync,createReadStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {VisionError} from './vision.mjs';
import {generateAvailableRecipes,recipeAvailability} from './recipe-service.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const envFile=path.join(root,'.env');
if(existsSync(envFile))for(const line of readFileSync(envFile,'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');}
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT debe estar entre 1024 y 65535.');
const provider=(process.env.AI_PROVIDER||'gemini').trim().toLowerCase();
if(!['gemini','openai'].includes(provider))throw new Error('AI_PROVIDER debe ser gemini u openai.');
const apiKey=provider==='gemini'?process.env.GEMINI_API_KEY:process.env.OPENAI_API_KEY;
const model=provider==='gemini'?(process.env.GEMINI_MODEL||'gemini-3.8-flash'):(process.env.OPENAI_MODEL||'gpt-4.1-mini');
const keyName=provider==='gemini'?'GEMINI_API_KEY':'OPENAI_API_KEY';
// Render supplies its public URL; custom domains can use PUBLIC_ORIGIN.
const allowedOrigins=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
for(const value of [process.env.RENDER_EXTERNAL_URL,process.env.PUBLIC_ORIGIN].filter(Boolean)){
 const origin=new URL(value);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('PUBLIC_ORIGIN y RENDER_EXTERNAL_URL deben ser una URL HTTPS sin ruta.');
 allowedOrigins.add(origin.origin);
}
const allowedHosts=new Set([...allowedOrigins].map(origin=>new URL(origin).host));
const host=process.env.HOST||(process.env.RENDER?'0.0.0.0':'127.0.0.1');
const webRoot=existsSync(path.join(root,'dist','index.html'))?path.join(root,'dist'):root;
const assets={'/assets/keepr-home-icon.png':'assets/keepr-home-icon.png','/manifest.webmanifest':'manifest.webmanifest','/detector-core.js':'detector-core.js','/local-detector.js':'local-detector.js','/local-detector.worker.js':'local-detector.worker.js','/assets/kitchen.webp':'assets/kitchen.webp','/assets/keepr-portada.webp':'assets/keepr-portada.webp','/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/food-catalog.js':'food-catalog.js','/assets/keepr-bowl.svg':'assets/keepr-bowl.svg','/assets/market.jpg':'assets/market.jpg','/assets/kitchen.jpg':'assets/kitchen.jpg','/kitchen.js':'kitchen.js','/assets/keepr-logo.svg':'assets/keepr-logo.svg','/assets/keepr-mark.svg':'assets/keepr-mark.svg','/assets/keepr-logo-light.svg':'assets/keepr-logo-light.svg','/assets/keepr-mark-light.svg':'assets/keepr-mark-light.svg','/assets/fonts/manrope-variable.ttf':'assets/fonts/manrope-variable.ttf','/assets/fonts/newsreader-variable.ttf':'assets/fonts/newsreader-variable.ttf'};
for(const f of ['ort.wasm.min.js','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm','MODEL-CARD.md','ONNX-Runtime-LICENSE.txt','YOLO-LICENSE.txt'])assets['/assets/detector/'+f]='assets/detector/'+f;
const mime={'.png':'image/png','.webmanifest':'application/manifest+json','.onnx':'application/octet-stream','.wasm':'application/wasm','.mjs':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.jpg':'image/jpeg','.svg':'image/svg+xml','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
let busy=false;
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req){const parts=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>25*1024*1024)throw new VisionError(413,'Las imágenes son demasiado grandes. Selecciona hasta 3 fotos.');parts.push(chunk);}try{return JSON.parse(Buffer.concat(parts).toString());}catch{throw new VisionError(400,'Solicitud inválida.');}}
const server=http.createServer(async(req,res)=>{
 if(['GET','HEAD'].includes(req.method)&&req.url==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:'ok');return;}
 if(!allowedHosts.has(req.headers.host))return json(res,403,{error:'Host no permitido.'});
 if(req.headers.origin&&!allowedOrigins.has(req.headers.origin))return json(res,403,{error:'Origen no permitido.'});
 const url=new URL(req.url,`http://127.0.0.1:${port}`);
 if(['GET','HEAD'].includes(req.method)&&url.pathname==='/assets/detector/ingredients-yolov8x-v2.onnx'){
  const modelPath=path.join(root,'models/ingredients-yolov8x-v2.onnx.gz');
  if(!existsSync(modelPath))return json(res,503,{error:'El detector no está instalado. Ejecuta npm run build.'});
  res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Encoding':'gzip','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();else{const stream=createReadStream(modelPath);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}return;
 }
 if(url.pathname==='/api/analyze')return json(res,410,{error:'La detección ahora se ejecuta en tu dispositivo. Recarga Keepr para usarla.'});
 if(req.method==='GET'&&url.pathname==='/api/status')return json(res,200,{configured:true,provider:'local-yolo',coverage:82,recipes:recipeAvailability(process.env)});
 if(req.method==='POST'&&url.pathname==='/api/recipes'){
  if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{error:'Usa JSON.'});
  if(busy)return json(res,429,{error:'Hay un análisis en curso. Espera a que termine.'});
  busy=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),120000);const disconnected=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnected);
  try{const input=await body(req);const result=await generateAvailableRecipes(input.items,{env:process.env,count:input.count??3,previousNames:input.previousNames??[],today:input.today,signal:controller.signal});if(!res.destroyed)json(res,200,result);}catch(e){if(!res.destroyed)json(res,e instanceof VisionError?e.status:500,{error:e instanceof VisionError?e.message:'Ocurrió un error inesperado. No se guardaron alimentos.'});}finally{clearTimeout(timer);busy=false;res.off('close',disconnected);}return;
 }
 if(['GET','HEAD'].includes(req.method)&&assets[url.pathname]){const file=assets[url.pathname];if(!existsSync(path.join(webRoot,file)))return json(res,404,{error:'Archivo no encontrado.'});res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:readFileSync(path.join(webRoot,file)));return;}
 json(res,404,{error:'Ruta no encontrada.'});
});
server.requestTimeout=135000;
server.listen(port,host,()=>console.log(`Keepr: http://localhost:${port}\nAnálisis de fotos: YOLO local, sin API`));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`El puerto ${port} está ocupado. Cambia PORT en .env.`:'No se pudo iniciar el servidor.');process.exit(1);});
