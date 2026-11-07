import test from 'node:test';
import assert from 'node:assert/strict';
import {planRecipes} from '../recipe-planner.mjs';
import {generateAvailableRecipes,recipeAvailability} from '../recipe-service.mjs';
import {validateRecipes} from '../recipes.mjs';
const today='2026-11-06';
const inventory=names=>names.map((name,index)=>({id:index+1,name,quantity:'Por confirmar',date:null}));
test('crea recetas sin claves y sin contactar proveedores',async()=>{
 let calls=0;const items=inventory(['Huevo','Jitomate','Espinaca']);
 const result=await generateAvailableRecipes(items,{env:{},today,count:1,fetchImpl:()=>{calls++;throw Error('No debe contactar una API');}});
 assert.equal(calls,0);assert.equal(result.recipes.length,1);assert.equal(recipeAvailability({}).configured,true);assert.equal(recipeAvailability({}).provider,'keepr');validateRecipes(result,items);
});
test('combina grupos culinarios compatibles sin mezclar carne con fruta ni añadir productos',()=>{
 const items=inventory(['Pechuga de pollo','Brócoli','Zanahoria','Mango','Yogur','Arroz']);
 const result=planRecipes(items,{today,count:3});assert.equal(result.recipes.length,3);
 const byId=new Map(items.map(i=>[i.id,i.name]));
 for(const r of result.recipes){const names=r.ingredients.map(i=>byId.get(i.inventoryId));assert(names.every(Boolean));assert(!(names.includes('Pechuga de pollo')&&names.includes('Mango')));assert(!r.ingredients.some(i=>/piezas|gramos/.test(i.amount)));assert(r.steps.length>=2);}
});
test('excluye fechas superadas, conserva fechas pendientes y recordatorios',()=>{
 const items=inventory(['Huevo','Jitomate','Brócoli']);items[0].date='2026-11-05';items[1].date='2026-11-01';items[1].dateKind='estimated';
 const result=planRecipes(items,{today,count:3});assert(result.recipes.length>0);assert(result.recipes.every(r=>r.ingredients.every(i=>i.inventoryId!==1)));
});
test('no repite nombres anteriores y explica cuando no quedan preparaciones',()=>{
 const items=inventory(['Huevo']);const first=planRecipes(items,{today});assert.equal(first.recipes.length,1);
 const second=planRecipes(items,{today,previousNames:[first.recipes[0].name]});assert.equal(second.recipes.length,0);assert.match(second.notes,/Ya tienes/);
});
test('no inventa recetas con harina sola, aromáticos o nombres desconocidos',()=>{
 for(const names of [['Harina'],['Cilantro','Ajo'],['Comida desconocida']]){const result=planRecipes(inventory(names),{today});assert.equal(result.recipes.length,0);assert.match(result.notes,/Agrega/);}
});
test('prioriza ingredientes con fechas cercanas y respeta la cancelación',async()=>{
 const items=inventory(['Manzana','Pera','Huevo']);items[2].date=today;
 assert(planRecipes(items,{today}).recipes[0].ingredients.some(i=>i.inventoryId===3));
 const controller=new AbortController();controller.abort();await assert.rejects(generateAvailableRecipes(items,{env:{},today,signal:controller.signal}),/canceló/);
});
test('rechaza parámetros inválidos antes de planificar',()=>{for(const count of [0,4,1.5])assert.throws(()=>planRecipes(inventory(['Huevo']),{today,count}));assert.throws(()=>planRecipes(inventory(['Huevo']),{today,previousNames:[null]}));});

test('prioriza el lote más próximo y produce ideas con subconjuntos sin ensaladas reordenadas',()=>{
 const items=inventory(['Jitomate','Espinaca','Aguacate','Huevo','Tortilla','Pepino','Frijol','Jitomate']);
 items[0].date=today;
 items[7].date='2026-11-10';
 const suggestions=[];
 for(let attempt=0;attempt<5;attempt++){
  suggestions.push(...planRecipes(items,{today,count:3,previousNames:suggestions.map(r=>r.name)}).recipes);
 }
 assert(suggestions[0].ingredients.some(i=>i.inventoryId===1));
 assert(!suggestions.some(r=>r.ingredients.some(i=>i.inventoryId===8)));
 assert.equal(suggestions.filter(r=>r.name.startsWith('Ensalada')&&!r.name.includes('frijol')).length,1);
 assert(suggestions.some(r=>r.name==='Tacos de frijol'&&r.ingredients.length===2));
 assert(suggestions.some(r=>r.name.startsWith('Sopa')));
 assert(suggestions.every(r=>r.ingredients.length<items.length));
});

test('distingue una fecha registrada de un recordatorio y de un alimento sin fecha',()=>{
 const items=inventory(['Huevo','Pera','Leche','Chocolate']);
 items[1].date='2026-11-07';
 items[1].dateKind='estimated';
 items[2].date='2026-11-12';
 const {recipes}=planRecipes(items,{today,count:3});
 assert.equal(recipes[0].name,'Chocolate caliente');
 assert(recipes[1].ingredients.some(i=>i.inventoryId===2));
 assert(recipes.every(recipe=>recipe.ingredients.length<items.length));
});
