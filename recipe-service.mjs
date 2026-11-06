import {planRecipes} from './recipe-planner.mjs';
import {generateRecipes,validateInventory} from './recipes.mjs';
import {VisionError} from './vision.mjs';
const defaultModels=['google/gemini-2.5-flash-lite','mistralai/mistral-small-3.2-24b-instruct'];
export function recipeRoutes(env={}){
 const routes=[];const preferred=(env.RECIPE_PROVIDER||'auto').trim().toLowerCase();
 if(!['auto','openrouter','gemini','openai'].includes(preferred))throw new VisionError(503,'La configuración del servicio de recetas necesita revisión.');
 const candidates={
  openrouter:{provider:'openrouter',apiKey:env.OPENROUTER_API_KEY,models:env.OPENROUTER_RECIPE_MODELS?env.OPENROUTER_RECIPE_MODELS.split(',').map(s=>s.trim()).filter(Boolean):defaultModels},
  gemini:{provider:'gemini',apiKey:env.GEMINI_API_KEY,model:env.GEMINI_MODEL||'gemini-3.8-flash'},
  openai:{provider:'openai',apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL||'gpt-4.1-mini'}
 };
 const existing=env.AI_PROVIDER==='openai'?'openai':'gemini';
 // Only explicitly configured keys are eligible. No hidden/free public gateways.
 const order=preferred==='auto'?['openrouter',existing]:[preferred,...(preferred==='openrouter'?[existing]:['openrouter'])];
 for(const name of [...new Set(order)])if(candidates[name].apiKey)routes.push(candidates[name]);
 return routes;
}
export function recipeAvailability(env={}){
 let routes;try{routes=recipeRoutes(env);}catch{return {configured:false,provider:null,recipients:[],fallbackReady:false,openrouterConfigured:false};}const labels={openrouter:'OpenRouter y los proveedores de sus modelos',gemini:'Google Gemini',openai:'OpenAI'};
 return {configured:true,provider:routes[0]?.provider||'keepr',recipients:routes.map(r=>labels[r.provider]),fallbackReady:routes.length>1||routes.some(r=>r.provider==='openrouter'&&r.models.length>1),openrouterConfigured:routes.some(r=>r.provider==='openrouter')};
}
export async function generateAvailableRecipes(input,{env={},today,count=3,previousNames=[],signal,fetchImpl=fetch,attemptTimeoutMs=30000}={}){
 const inventory=validateInventory(input,today);if(!inventory.length)return {recipes:[],notes:'Revisa tu inventario antes de crear una receta.'};
 const routes=recipeRoutes(env);if(!routes.length){if(signal?.aborted)throw new VisionError(504,'La creación de la receta se canceló.');return planRecipes(input,{today,count,previousNames});}
 for(let index=0;index<routes.length;index++){
  if(signal?.aborted)throw new VisionError(504,'La creación de la receta se canceló.');
  const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,attemptTimeoutMs);
  try{return await generateRecipes(inventory,{...routes[index],today,count,previousNames,signal:controller.signal,fetchImpl});}
  catch(error){
   if(signal?.aborted)throw new VisionError(504,'La creación de la receta se canceló.');
   const retryable=error instanceof VisionError&&[429,502,503,504].includes(error.status)&&error.retryable!==false;
   if(!retryable||index===routes.length-1)throw error;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
}
