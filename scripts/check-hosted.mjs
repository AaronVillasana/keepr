import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const url='https://keepr.test';
const get=path=>worker.fetch(new Request(url+path));
assert.equal((await get('/')).status,200);
assert.match(await (await get('/')).text(),/kitchen.js/);
assert.equal((await get('/assets/market.jpg')).headers.get('Content-Type'),'image/jpeg');
assert.equal((await get('/styles.css')).status,200);
assert.equal((await get('/missing')).status,404);
const status=await (await get('/api/status')).json();assert.equal(status.configured,true);assert.equal(status.provider,'local-yolo');assert.equal(status.coverage,82);assert(!('apiKey' in status));
assert.equal((await worker.fetch(new Request(url+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}))).status,410);
assert.equal((await worker.fetch(new Request(url+'/api/recipes',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://other.test'},body:'{}'}))).status,403);
assert.equal((await worker.fetch(new Request(url+'/api/recipes',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'}))).status,415);
assert.equal((await worker.fetch(new Request(url+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'broken'}),{GEMINI_API_KEY:'dummy'})).status,410);
assert.equal((await get('/assets/fonts/manrope-variable.ttf')).status,200);
assert.equal((await get('/assets/fonts/manrope-variable.ttf')).headers.get('Content-Type'),'font/ttf');
assert.equal((await get('/assets/kitchen.jpg')).status,200);
assert.equal((await get('/assets/kitchen.jpg')).headers.get('Content-Type'),'image/jpeg');
assert.equal((await get('/assets/fonts/newsreader-variable.ttf')).status,200);
assert.equal((await get('/assets/fonts/newsreader-variable.ttf')).headers.get('Content-Type'),'font/ttf');
console.log('Controles de rutas, tipografías, imagen y respuestas del Worker aprobados.');

assert.equal((await get('/assets/kitchen.webp')).headers.get('Content-Type'),'image/webp');

for(const [path,type] of [['/assets/detector/ort-wasm-simd-threaded.wasm','application/wasm']]){const res=await get(path);assert.equal(res.status,200);assert.equal(res.headers.get('Content-Type'),type);assert.equal(res.headers.get('Content-Encoding'),'gzip');const bytes=gunzipSync(new Uint8Array(await res.arrayBuffer()));assert(bytes.length>2000000);}
assert.equal((await get('/local-detector.worker.js')).status,200);

assert.equal((await get('/assets/detector/ingredients-yolov8x-v2.onnx')).status,503);
const fakeBucket={head:async()=>({httpEtag:'"model"'}),get:async()=>({httpEtag:'"model"',body:new Uint8Array([1,2,3])})};
const modelResponse=await worker.fetch(new Request(url+'/assets/detector/ingredients-yolov8x-v2.onnx'),{BUCKET:fakeBucket});assert.equal(modelResponse.status,200);assert.equal(modelResponse.headers.get('Content-Encoding'),'gzip');
