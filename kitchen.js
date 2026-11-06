'use strict';
// Shared deterministic domain rules, usable without a network or AI provider.
const Kitchen = (() => {
 function validDate(s) { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s; }
 function due(i,today){return Boolean(i.date&&i.date<=today&&i.dateKind==='estimated');}
 function allowed(i,today){return !i.date||i.dateKind==='estimated'||i.date>=today;}
 const templates=[
 {name:'Huevos con jitomate',foods:['Huevo','Jitomate'],minutes:15,steps:['Lava y corta el jitomate. Cocínalo en una sartén antiadherente con un poco de agua.','Agrega los huevos batidos. Remueve y cocina hasta que estén completamente cuajados.']},
 {name:'Ensalada de aguacate y pepino',foods:['Aguacate','Pepino'],minutes:10,steps:['Lava el pepino y córtalo en medias lunas.','Abre el aguacate, retira el hueso y corta la pulpa. Mezcla con el pepino y sirve enseguida.']},
 {name:'Tacos de huevo con espinaca',foods:['Huevo','Espinaca','Tortilla'],minutes:15,steps:['Lava la espinaca. Cocínala en sartén antiadherente con un poco de agua.','Agrega el huevo batido y cocina completamente.','Calienta las tortillas y reparte el relleno.']},
 {name:'Ensalada de jitomate y aguacate',foods:['Jitomate','Aguacate'],minutes:10,steps:['Lava el jitomate y córtalo en cubos.','Corta la pulpa del aguacate y mezcla con el jitomate. Sirve al momento.']},
 {name:'Papa con huevo',foods:['Papa','Huevo'],minutes:25,steps:['Lava y corta la papa en cubos pequeños. Hiérvela en agua hasta que esté tierna y escurre.','Pásala a una sartén antiadherente. Agrega huevo batido y cocina hasta que esté completamente cuajado.']},
 {name:'Avena con plátano',foods:['Avena','Plátano'],minutes:12,steps:['Cuece la avena en agua siguiendo las indicaciones del empaque.','Pela y corta el plátano. Agrégalo a la avena al servir.']},
 {name:'Arroz con lentejas',foods:['Arroz','Lenteja'],minutes:40,steps:['Enjuaga las lentejas. Hiérvelas hasta que estén completamente tiernas; el tiempo depende de la variedad. Si ya están cocidas, solo calienta.','Cuece el arroz en agua siguiendo las instrucciones del empaque. Si ya está cocido, recaliéntalo completamente.','Mezcla ambos ingredientes y sirve caliente.']},
 {name:'Quesadillas',foods:['Tortilla','Queso'],minutes:10,steps:['Coloca queso dentro de cada tortilla y dóblala.','Calienta por ambos lados en una sartén hasta que el queso esté fundido.']}
 ];
 function suggest(items,today,sameFood){const usable=items.filter(i=>allowed(i,today));return templates.flatMap((t,index)=>{const found=t.foods.map(n=>usable.filter(i=>sameFood(n,i.name)).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'))[0]);if(found.some(i=>!i))return [];return [{id:2000+index,name:t.name,time:t.minutes,servings:1,sourceIds:found.map(i=>i.id),needs:found.map(i=>i.name),amounts:found.map(()=> 'Al gusto; confirma la cantidad disponible'),steps:t.steps,pantry:'Receta del recetario de Keepr. Solo se presupone agua. Ajusta las porciones a tus cantidades y revisa el estado de los alimentos antes de cocinar.',local:true}];}).slice(0,5);}
 function consume(items,updates){const ids=new Set();for(const u of updates){if(ids.has(u.id)||!items.some(i=>i.id===u.id))throw new Error('El inventario cambió. Vuelve a abrir la receta.');ids.add(u.id);if(!u.finished&&(!u.remaining.trim()||u.remaining.length>100))throw new Error('Indica cuánto queda o marca que se terminó.');}return {items:items.flatMap(i=>{const u=updates.find(u=>u.id===i.id);return !u?[i]:u.finished?[]:[{...i,quantity:u.remaining.trim(),quantitySource:'manual'}];}),consumed:updates.filter(u=>u.finished).length};}
 function readRecipeCache(raw,signature,items){
  try{const data=JSON.parse(raw);if(data?.signature!==signature||!Array.isArray(data.recipes)||data.recipes.length>12)return [];
   const ids=new Set();const inventory=new Map(items.map(i=>[i.id,i]));const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
   const valid=data.recipes.every(r=>r&&Number.isSafeInteger(r.id)&&r.id>10000&&!ids.has(r.id)&&ids.add(r.id)&&text(r.name,100)&&Number.isInteger(r.time)&&r.time>0&&r.time<=180&&Number.isInteger(r.servings)&&r.servings>0&&r.servings<=10&&Array.isArray(r.sourceIds)&&r.sourceIds.length>0&&r.sourceIds.length<=30&&new Set(r.sourceIds).size===r.sourceIds.length&&r.sourceIds.every(id=>inventory.has(id))&&Array.isArray(r.needs)&&r.needs.length===r.sourceIds.length&&r.needs.every((name,index)=>name===inventory.get(r.sourceIds[index]).name)&&Array.isArray(r.amounts)&&r.amounts.length===r.needs.length&&r.amounts.every(v=>text(v,100))&&Array.isArray(r.steps)&&r.steps.length>0&&r.steps.length<=20&&r.steps.every(v=>text(v,1200))&&typeof r.pantry==='string'&&r.pantry.length<=1500&&!r.local);
   return valid?data.recipes:[];
  }catch{return [];}
 }
 return {validDate,allowed,due,suggest,consume,readRecipeCache};
})();
if(typeof module!=='undefined')module.exports=Kitchen;
