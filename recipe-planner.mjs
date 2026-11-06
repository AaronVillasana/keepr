import {validateInventory,validateRecipes} from './recipes.mjs';
import {VisionError} from './vision.mjs';

const key=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const groups={
 fruit:'Arándano|Arándano rojo|Cereza|Chirimoya|Durazno|Frambuesa|Fresa|Grosella|Guayaba|Kiwi|Kumquat|Mango|Manzana|Melón|Mora|Naranja|Mandarina|Papaya|Pera|Piña|Pitahaya|Plátano|Sandía|Uva',
 raw:'Aguacate|Jitomate|Tomate|Pepino|Lechuga|Hojas verdes|Espinaca|Rábano|Zanahoria|Pimiento|Col|Repollo',
 veg:'Alcachofa|Berenjena|Betabel|Brócoli|Calabacita|Calabaza|Camote|Cebolla|Col|Repollo|Coliflor|Chícharo|Elote|Espárrago|Espinaca|Hojas verdes|Jitomate|Tomate|Zanahoria|Papa|Champiñón|Nopal|Okra|Pimiento|Poro',
 protein:'Carne|Carne de cerdo|Cerdo|Carne de cordero|Carne de res|Carne molida|Carne molida de res|Pollo|Pechuga de pollo|Pescado|Camarón|Salmón|Atún',
 pulses:'Frijol|Frijol blanco|Lenteja|Garbanzo',
 aromatic:'Ajo|Cilantro|Perejil|Albahaca|Chile|Chile verde|Jengibre|Pimienta larga',
 greens:'Espinaca|Lechuga|Hojas verdes|Col|Repollo',
 creamy:'Yogur|Yogurt',
 dairy:'Queso|Mantequilla',
 bread:'Pan|Tortilla',
 rice:'Arroz',
 egg:'Huevo',
 tofu:'Tofu',
 ham:'Jamón|Salchicha|Tocino|Anchoa',
 pasta:'Pasta|Espagueti',
 oats:'Avena',
 citrus:'Limón|Limón amarillo',
 milk:'Leche',
 chocolate:'Chocolate'
};
const sets=Object.fromEntries(Object.entries(groups).map(([group,names])=>[group,new Set(names.split('|').map(key))]));
const join=items=>items.map(i=>i.name.toLocaleLowerCase('es')).join(' y ');
const prepVeg='Lava las verduras. Pela o retira las partes que no se comen y corta en piezas pequeñas.';
const notes='Ajusta las porciones a la cantidad disponible. Revisa el estado de los alimentos. Solo se presupone agua; no necesitas agregar sal, aceite ni otros ingredientes.';
const cookProtein=items=>`Cocina ${join(items)} por separado hasta que la cocción sea completa, usando una sartén antiadherente con un poco de agua si hace falta. Sigue las instrucciones de conservación y preparación del envase.`;

// A bounded set of culinary methods; no API call and no invented stock or ingredients.
export function planRecipes(input,{today,count=1,previousNames=[]}={}){
 if(!Number.isInteger(count)||count<1||count>3||!Array.isArray(previousNames)||previousNames.length>10||previousNames.some(n=>typeof n!=='string'||!n.trim()||n.length>100))throw new VisionError(400,'Revisa los ingredientes e intenta crear la receta de nuevo.');
 const inventory=validateInventory(input,today).sort((a,b)=>(a.dateKind==='estimated'?'9999':a.date||'9999').localeCompare(b.dateKind==='estimated'?'9999':b.date||'9999'));
 const unique=[...new Map(inventory.map(i=>[key(i.name),i])).values()];
 const get=(group,max=3)=>unique.filter(i=>sets[group].has(key(i.name))).slice(0,max);
 const veg=get('veg'),raw=get('raw'),fruits=get('fruit'),protein=get('protein',1),pulses=get('pulses',1),egg=get('egg',1),rice=get('rice',1),bread=get('bread',1),tofu=get('tofu',1),dairy=get('dairy',1),yogurt=get('creamy',1),pasta=get('pasta',1),oats=get('oats',1),milk=get('milk',1),chocolate=get('chocolate',1),aromatics=get('aromatic',1);
 const candidates=[];
 function add(name,minutes,foods,steps,extra=''){
  const selected=[...new Map(foods.map(i=>[i.id,i])).values()];
  if(!selected.length)return;
  const recipe={name:name.slice(0,100),minutes,servings:1,ingredients:selected.map(i=>({inventoryId:i.id,amount:'Al gusto; ajusta a la cantidad disponible'})),steps,notes:notes+(extra?' '+extra:'')};
  const priority=selected.reduce((sum,i)=>sum+(i.date&&i.dateKind!=='estimated'?Math.max(0,30-Math.round((Date.parse(i.date)-Date.parse(today))/86400000)):0),0);
  candidates.push({recipe,priority});
 }
 for(const base of egg){
  for(const v of veg.slice(0,3))add(`Huevos con ${join([v])}`,20,[base,v], [prepVeg,`Cocina ${join([v])} en una sartén antiadherente con un poco de agua hasta que esté tierno. Si necesita más tiempo, cuécelo antes en agua.`,`Bate ${base.name.toLowerCase()} y agrégalo a la sartén. Remueve hasta que quede completamente cuajado. Sirve caliente.`]);
  add('Huevo cocido',15,[base],['Coloca el huevo en una olla y cúbrelo con agua.','Lleva a ebullición y cocina hasta que la clara y la yema estén firmes. Enfría antes de pelar y sirve.']);
 }
 if(raw.length>=2)for(let offset=0;offset<Math.min(raw.length,3);offset++){
  const foods=[...raw.slice(offset),...raw.slice(0,offset)].slice(0,Math.min(3,raw.length));
  add(`Ensalada de ${join(foods.slice(0,2))}`,12,foods,[prepVeg,`Corta ${join(foods)} en trozos del tamaño de un bocado. Si usas aguacate, retira el hueso y la cáscara.`,`Mezcla los ingredientes y sirve enseguida.`]);
 }
 if(veg.length){
  add(`Verduras al vapor: ${join(veg.slice(0,2))}`,30,veg,[prepVeg,'Pon agua en una olla y coloca las verduras en una vaporera, sin sumergirlas.','Tapa y cocina hasta que cada verdura esté tierna. Retira primero las piezas que se cocinen más rápido y sirve.']);
  add(`Sopa de ${join(veg.slice(0,2))}`,35,veg,[prepVeg,`Pon ${join(veg)} en una olla y añade agua hasta cubrir. Cocina a fuego suave hasta que las piezas estén tiernas.`,'Sirve caliente con parte del agua de cocción.']);
 }
 for(const base of rice){
  const sides=veg.slice(0,2),foods=[base,...sides,...protein];
  add(sides.length?`Arroz con ${join(sides)}`:protein.length?`Arroz con ${join(protein)}`:'Arroz sencillo',protein.length?45:30,foods,[`Enjuaga ${base.name.toLowerCase()} y cuécelo en agua según las indicaciones del paquete. Si ya está cocido, recaliéntalo por completo.`,...(sides.length?[prepVeg,`Cuece ${join(sides)} por separado en agua hasta que esté tierno y escurre.`]:[]),...(protein.length?[cookProtein(protein)]:[]),'Combina los ingredientes preparados y sirve caliente.']);
 }
 for(const base of protein){
  const sides=veg.slice(0,2);
  add(`${base.name}${sides.length?' con '+join(sides):' a la sartén'}`,40,[base,...sides],[...(sides.length?[prepVeg,`Cuece ${join(sides)} en agua hasta que esté tierno y escurre.`]:[]),cookProtein([base]),'Sirve la preparación caliente, con los acompañamientos indicados si los hay.']);
 }
 if(tofu.length){const sides=veg.slice(0,2);add(`Tofu${sides.length?' con '+join(sides):' a la sartén'}`,25,[...tofu,...sides],[...(sides.length?[prepVeg,`Cuece ${join(sides)} hasta que esté tierno y escurre.`]:[]),'Escurre el tofu y córtalo en cubos. Caliéntalo en una sartén antiadherente con un poco de agua.','Junta los ingredientes y calienta unos minutos antes de servir.']);}
 if(pulses.length){const sides=veg.slice(0,2);add(`${pulses[0].name}${sides.length?' con '+join(sides):' de olla'}`,90,[...pulses,...sides],[`Prepara ${join(pulses)} según su presentación: si está seco, sigue las instrucciones de remojo y cocción del empaque hasta que quede completamente tierno; si ya está cocido, caliéntalo por completo.`,...(sides.length?[prepVeg,`Cuece ${join(sides)} en agua y agrégalo a la legumbre ya cocida.`]:[]),'Ajusta con agua de cocción si hace falta y sirve caliente.'],'El tiempo puede variar según la legumbre y si ya está cocida.');}
 if(bread.length){const filling=[...dairy,...raw.slice(0,2)];if(filling.length)add(`${key(bread[0].name)==='tortilla'?'Tortillas':'Pan'} con ${join(filling.slice(0,2))}`,12,[...bread,...filling],[...(raw.length?[prepVeg]:[]),`Reparte ${join(filling)} sobre ${join(bread)}.`,'Si lleva queso, puedes calentar en una sartén antiadherente antes de agregar las verduras. Sirve enseguida.']);}
 if(pasta.length){const sides=veg.slice(0,2);add(`Pasta${sides.length?' con '+join(sides):' sencilla'}`,25,[...pasta,...sides],[`Cuece ${join(pasta)} en agua según el empaque y escurre.`,...(sides.length?[prepVeg,`Cuece ${join(sides)} hasta que esté tierno y mezcla con la pasta.`]:[]),'Sirve caliente.']);}
 if(fruits.length){
  for(let offset=0;offset<Math.min(fruits.length,3);offset++){
   const chosen=[...fruits.slice(offset),...fruits.slice(0,offset)].slice(0,3);
   add(yogurt.length?`Yogur con ${join(chosen.slice(0,2))}`:`Fruta preparada: ${join(chosen.slice(0,2))}`,10,[...yogurt,...chosen],['Lava la fruta. Pela y retira huesos o semillas que no se comen según corresponda.',`Corta ${join(chosen)} en trozos pequeños.`,yogurt.length?`Sirve la fruta con ${join(yogurt)} y mezcla al momento.`:'Mezcla y sirve la fruta al momento.']);
  }
  const compote=fruits.filter(i=>['manzana','pera','durazno','fresa','mora','arandano','arandano rojo'].includes(key(i.name))).slice(0,2);
  if(compote.length)add(`Compota de ${join(compote)}`,25,compote,['Lava la fruta, retira las partes que no se comen y córtala.',`Cocina ${join(compote)} en una olla con un poco de agua a fuego suave hasta que se ablande.`,'Aplasta con un tenedor y sirve tibia o deja enfriar.']);
 }
 if(oats.length)add(`Avena${fruits.length?' con '+join(fruits.slice(0,1)):''}`,15,[...oats,...fruits.slice(0,1)],[`Cuece ${join(oats)} en agua según el empaque.`,...(fruits.length?['Lava o pela la fruta, retira las partes que no se comen y córtala. Agrégala al servir.']:['Sirve caliente.'])]);
 if(milk.length&&chocolate.length)add('Chocolate caliente',10,[...milk,...chocolate],[`Calienta ${join(milk)} a fuego suave, sin dejar de remover.`,`Añade ${join(chocolate)} en trozos y mezcla hasta que se derrita. Sirve con cuidado.`]);
 // Aromatics alone, flour alone, or an unknown product do not justify inventing a dish.
 const seen=new Set(previousNames.map(key));const chosen=[];
 for(const {recipe} of candidates.sort((a,b)=>b.priority-a.priority))if(!seen.has(key(recipe.name))){seen.add(key(recipe.name));chosen.push(recipe);if(chosen.length===count)break;}
 return validateRecipes({recipes:chosen,notes:chosen.length?'':candidates.length?'Ya tienes las preparaciones disponibles para estos ingredientes. Agrega otro alimento para descubrir más combinaciones.':'Agrega una base como huevo, arroz, verduras o fruta para encontrar una preparación con lo que tienes.'},inventory);
}
