import {VisionError} from '../vision.mjs';
import {generateAvailableRecipes,recipeAvailability} from '../recipe-service.mjs';
import {detectorModelRoute} from './detector-model.mjs';
import {staticFiles} from './static.generated.mjs';
const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request,env={}) {
 const url=new URL(request.url);
 const modelResponse=await detectorModelRoute(request,env);if(modelResponse)return modelResponse;
 if(url.pathname.startsWith('/api/')) {
  if(url.pathname==='/api/analyze')return response({error:'La detección ahora se ejecuta en tu dispositivo. Recarga Keepr para usarla.'},410);
  const provider=env.AI_PROVIDER||'gemini';const apiKey=provider==='openai'?env.OPENAI_API_KEY:env.GEMINI_API_KEY;
  const model=provider==='openai'?(env.OPENAI_MODEL||'gpt-4.1-mini'):(env.GEMINI_MODEL||'gemini-3.8-flash');
  if(request.method==='GET'&&url.pathname==='/api/status')return response({configured:true,provider:'local-yolo',coverage:82,recipes:recipeAvailability(env)});
  if(request.method!=='POST'||url.pathname!=='/api/recipes')return response({error:'Ruta no encontrada.'},404);
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return response({error:'Origen no permitido.'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return response({error:'Usa JSON.'},415);
  if(!recipeAvailability(env).configured)return response({error:'La personalización con IA todavía no está activada. Puedes usar el inventario y las recetas de Keepr.'},503);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),115000);
  try{const reader=request.body?.getReader();if(!reader)return response({error:'Solicitud vacía.'},400);let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>25*1024*1024){await reader.cancel();return response({error:'Las imágenes son demasiado grandes.'},413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}let input;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{return response({error:'Solicitud inválida.'},400);}const options={count:input.count??3,previousNames:input.previousNames??[],today:input.today,language:input.language,apiKey,model,provider,signal:controller.signal};return response(await generateAvailableRecipes(input.items,{...options,env}));}
  catch(e){return response({error:e instanceof VisionError?e.message:'No se pudo completar la solicitud. Intenta de nuevo.'},e instanceof VisionError?e.status:500);}finally{clearTimeout(timer);}
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Método no permitido',{status:405});
 const asset=staticFiles[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('No encontrado',{status:404});
 const data=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:data,{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Cache-Control':url.pathname.startsWith('/assets/detector/')?'public, max-age=86400':'no-cache',...(asset.encoding?{'Content-Encoding':asset.encoding}:{}),'Referrer-Policy':'strict-origin-when-cross-origin'}});
}};
