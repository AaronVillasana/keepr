import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import {once} from 'node:events';
import {createHash} from 'node:crypto';

test('Servidor Render: origen público, health check, aislamiento y modelo completo', {timeout:30000}, async t=>{
 const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'0.0.0.0',RENDER:'true',RENDER_EXTERNAL_URL:'https://keepr-test.onrender.com',PUBLIC_ORIGIN:'https://keepr.example',GEMINI_API_KEY:'',OPENAI_API_KEY:'',OPENROUTER_API_KEY:''},stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill());
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(([code])=>{throw Error('No arrancó: '+code);})]);
 function request(path,{method='GET',host='keepr-test.onrender.com',origin,hash=false,body}={}){
  return new Promise((resolve,reject)=>{
   const req=http.request({hostname:'127.0.0.1',port,path,method,headers:{Host:host,...(origin?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{})}},res=>{
    let text='',bytes=0;const digest=createHash('sha256');res.on('data',chunk=>{bytes+=chunk.length;if(hash)digest.update(chunk);else text+=chunk;});res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text,bytes,sha:hash?digest.digest('hex'):null}));res.on('error',reject);
   });req.on('error',reject);req.end(body);
  });
 }
 assert.equal((await request('/healthz',{host:'internal-render-host'})).text,'ok');
 const page=await request('/');assert.equal(page.status,200);assert.match(page.text,/Keepr/);
 assert.equal((await request('/',{method:'HEAD'})).bytes,0);
 const portada=await request('/assets/keepr-portada.webp',{hash:true});
 assert.equal(portada.status,200);
 assert.equal(portada.headers['content-type'],'image/webp');
 assert(portada.bytes>0);
 const status=await request('/api/status',{origin:'https://keepr-test.onrender.com'});assert.equal(status.status,200);assert.equal(JSON.parse(status.text).coverage,82);assert.equal(JSON.parse(status.text).recipes.configured,true);
 assert.equal((await request('/api/status',{host:'keepr.example',origin:'https://keepr.example'})).status,200);
 assert.equal((await request('/api/status',{origin:'https://other.example'})).status,403);
 assert.equal((await request('/api/status',{host:'other.example'})).status,403);
 assert.equal((await request('/.env')).status,404);
 assert.equal((await request('/server.mjs')).status,404);
 assert.equal((await request('/assets/detector/ort-wasm-simd-threaded.wasm',{method:'HEAD'})).headers['content-type'],'application/wasm');
 const items=['Tortilla','Pollo','Jitomate','Arroz','Mango'].map((name,id)=>({id,name,quantity:'Por confirmar',date:id===1?'2026-11-07':null}));
 const ideas=await request('/api/recipes',{method:'POST',body:JSON.stringify({items,today:'2026-11-06',count:3})});
 assert.equal(ideas.status,200);
 const suggestions=JSON.parse(ideas.text).recipes;
 assert.equal(suggestions.length,3);
 assert(suggestions.every(recipe=>recipe.ingredients.some(i=>i.inventoryId===1)&&recipe.ingredients.length<items.length));
 assert(suggestions.some(recipe=>recipe.name.startsWith('Tacos')));
 const model=await request('/assets/detector/ingredients-yolov8x-v2.onnx',{hash:true});
 assert.equal(model.status,200);assert.equal(model.headers['content-encoding'],'gzip');assert.equal(model.bytes,59784293);assert.equal(model.sha,'20cdaa297c18b7c60dd6e9ef7d50c27c296fe7df6282ffacdd46d067701b64b1');
});
