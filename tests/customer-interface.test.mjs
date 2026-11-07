import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
const core=createRequire(import.meta.url)('../detector-core.js');
function app(){const elements=new Map();const element=key=>{if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},querySelectorAll:()=>[],setAttribute(){},addEventListener(){},showModal(){},focus(){}});return elements.get(key);};const sandbox={Date,Intl,URL,AbortController,location:{hash:'#inicio'},setTimeout:()=>1,clearTimeout(){},window:{addEventListener(){},scrollTo(){},KeeprDetector:{supported:()=>true}},document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},fetch:()=>{throw Error('Unexpected fetch');}};vm.createContext(sandbox);vm.runInContext(['food-catalog.js','kitchen.js','detector-core.js','app.js'].map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8')).join('\n'),sandbox);return {run:source=>vm.runInContext(source,sandbox),element};}
test('los 82 nombres del detector tienen iconos vectoriales propios, sin recurrir al frasco',()=>{
 const ui=app(),paths=new Set();for(const name of core.coverage){const shape=ui.run('FOOD_ICON_PATHS['+JSON.stringify(name)+']');assert(shape,name);assert(!paths.has(shape),'Icono repetido: '+name);paths.add(shape);assert.match(ui.run('foodIcon('+JSON.stringify(name)+')'),/viewBox="0 0 24 24"/);assert(ui.run('FOOD_CATALOG.some(f=>f.name==='+JSON.stringify(name)+')'));}assert.equal(paths.size,82);
});
test('las pantallas de entrada, fotos y recetas presentan texto para clientes',async()=>{
 const ui=app();assert.equal(ui.run('state.items.length'),0);assert.match(ui.element('#content').innerHTML,/Escanear alimentos/);assert.doesNotMatch(ui.element('#content').innerHTML,/Resumen del inventario|Para usar primero/);ui.run('addOptions()');assert.doesNotMatch(ui.element('#modal-body').innerHTML,/Gemini|API|servicio de IA/);
 await ui.run('photoFlow()');assert.doesNotMatch(ui.element('#modal-body').innerHTML,/Gemini|API|91 etiquetas|detector local/);assert.equal(ui.element('#vision-status').hidden,true);
 await ui.run("page='recetas';refreshRecipes()");assert.doesNotMatch(ui.element('#content').innerHTML,/Gemini|OpenRouter|API|recipe-provider|recipe-row/);assert.match(ui.element('#content').innerHTML,/Aún no hay recetas/);
});

test('portada con inventario muestra búsqueda y distingue el recordatorio de una fecha registrada',()=>{
 const ui=app();
 ui.run("state.items=[{id:1,name:'Pollo',quantity:'Por confirmar',date:suggestedReview('Pollo'),dateKind:'estimated'}];renderHome()");
 assert.match(ui.element('#content').innerHTML,/Buscar ideas para cocinar/);
 assert.match(ui.element('#content').innerHTML,/Revisar en 1 día aprox/);
 assert.equal(ui.run("suggestedReview('Arroz')"),ui.run("dateIn(14)"));
 assert.equal(ui.run("suggestedReview('Chicken')"),ui.run("dateIn(1)"));
 assert.equal(ui.run("KeeprDetection.coverage.every(name=>suggestedReview(name))"),true);
 assert.equal(ui.run("suggestedReview('Producto desconocido')"),null);
});

test('el selector EN alterna Inicio, Inventario y Recetas sin cambiar los alimentos',()=>{
 const ui=app();
 ui.element('#language-toggle').onclick();
 assert.match(ui.element('#content').innerHTML,/What are we cooking/);
 assert.match(ui.element('#content').innerHTML,/Add manually/);
 ui.run("location.hash='#inventario';render()");
 assert.match(ui.element('#content').innerHTML,/Your inventory is empty/);
 ui.run("location.hash='#recetas';render()");
 assert.match(ui.element('#content').innerHTML,/No recipes yet/);
 assert.equal(ui.run('state.items.length'),0);
 ui.element('#language-toggle').onclick();
 assert.match(ui.element('#content').innerHTML,/Aún no hay recetas/);
});

test('el escáner y el formulario muestran sus instrucciones en inglés',async()=>{
 const ui=app();
 ui.element('#language-toggle').onclick();
 await ui.run('photoFlow()');
 const scan=ui.element('#modal-body').innerHTML;
 assert.match(scan,/Take photo opens the camera/);
 assert.match(scan,/0 of 3 photos/);
 assert.match(scan,/What Keepr can recognize · 82 foods/);
 assert.match(scan,/Tomato/);
 assert.match(scan,/Analyze food/);
 assert.doesNotMatch(scan,/Revisa los nombres|Jitomate|Analizar alimentos/);
 ui.element('#food-name').value='';
 ui.run('editItem()');
 assert.match(ui.element('#modal-body').innerHTML,/placeholder="e.g. Tomato"/);
});

test('volver a escanear pimientos actualiza el registro sin duplicar ni sumar el recuento',()=>{
 const ui=app();
 assert.equal(ui.run(`const scanned=[{id:1,name:'Pimiento',quantity:'2 unidades',quantitySource:'detected'}];
 const fresh={id:2,name:'pimiento',quantity:'3 unidades',quantitySource:'detected'};
 mergeScannedFood(scanned,fresh);mergeScannedFood(scanned,fresh);
 scanned.length===1 && scanned[0].id===1 && scanned[0].quantity==='3 unidades'`),true);
 assert.equal(ui.run(`scanned[0].quantity='500 g';scanned[0].quantitySource='manual';
 mergeScannedFood(scanned,fresh);scanned[0].quantity`),'500 g');
});
