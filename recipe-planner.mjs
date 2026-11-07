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
const list=new Intl.ListFormat('es-MX',{style:'long',type:'conjunction'});
const dateTier=item=>!item.date?2:item.dateKind==='estimated'?1:0;
const join=items=>list.format(items.map(i=>i.name.toLocaleLowerCase('es')));
const prepVeg='Lava las verduras. Pela o retira las partes que no se comen y corta en piezas pequeñas.';
const notes='Ajusta las porciones a la cantidad disponible. Revisa el estado de los alimentos. Solo se presupone agua; no necesitas agregar sal, aceite ni otros ingredientes.';
const cookProtein=items=>`Cocina ${join(items)} por separado hasta que la cocción sea completa, usando una sartén antiadherente con un poco de agua si hace falta. Sigue las instrucciones de conservación y preparación del envase.`;

// A bounded set of culinary methods; no API call and no invented stock or ingredients.
export function planRecipes(input,{today,count=1,previousNames=[]}={}){
 if(!Number.isInteger(count)||count<1||count>3||!Array.isArray(previousNames)||previousNames.length>20||previousNames.some(n=>typeof n!=='string'||!n.trim()||n.length>100))throw new VisionError(400,'Revisa los ingredientes e intenta crear la receta de nuevo.');
 const inventory=validateInventory(input,today).sort((a,b)=>dateTier(a)-dateTier(b)||(a.date||'9999').localeCompare(b.date||'9999'));
 const unique=inventory.filter((item,index)=>inventory.findIndex(other=>key(other.name)===key(item.name))===index);
 const get=(group,max=3)=>unique.filter(i=>sets[group].has(key(i.name))).slice(0,max);
 const veg=get('veg'),raw=get('raw'),fruits=get('fruit'),protein=get('protein',1),pulses=get('pulses',1),egg=get('egg',1),rice=get('rice',1),tofu=get('tofu',1),dairy=get('dairy',1),yogurt=get('creamy',1),pasta=get('pasta',1),oats=get('oats',1),milk=get('milk',1),chocolate=get('chocolate',1);
 const candidates=[];
 function add(name,minutes,foods,steps,extra=''){
  const selected=[...new Map(foods.map(i=>[i.id,i])).values()];
  if(!selected.length)return;
  const recipe={name:name.slice(0,100),minutes,servings:1,ingredients:selected.map(i=>({inventoryId:i.id,amount:'Al gusto; ajusta a la cantidad disponible'})),steps,notes:notes+(extra?' '+extra:'')};
  const nearest=selected.reduce((date,item)=>
   item.dateKind!=='estimated'&&item.date&&item.date<date?item.date:date,'9999');
  const review=selected.reduce((date,item)=>
   item.dateKind==='estimated'&&item.date&&item.date<date?item.date:date,'9999');
  candidates.push({recipe,nearest,review});
 }
 for(const base of egg){
  for(const v of veg.slice(0,3))add(`Huevos con ${join([v])}`,20,[base,v], [prepVeg,`Cocina ${join([v])} en una sartén antiadherente con un poco de agua hasta que esté tierno. Si necesita más tiempo, cuécelo antes en agua.`,`Bate ${base.name.toLowerCase()} y agrégalo a la sartén. Remueve hasta que quede completamente cuajado. Sirve caliente.`]);
  add('Huevo cocido',15,[base],['Coloca el huevo en una olla y cúbrelo con agua.','Lleva a ebullición y cocina hasta que la clara y la yema estén firmes. Enfría antes de pelar y sirve.']);
 }
 if(raw.length>=2){
  const foods=raw.slice(0,3);
  add(`Ensalada de ${join(foods)}`,12,foods,[
   'Lava los vegetales y retira las partes que no se comen.',
   `Corta ${join(foods)} en trozos, mezcla y sirve enseguida.`
  ]);
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
 for(const base of get('bread',2)){
  const tortilla=key(base.name)==='tortilla';
  const dish=tortilla?'Tacos':'Tostadas de pan';
  if(egg.length){
   const filling=[...egg,...veg.slice(0,1)];
   add(`${dish} de ${join(filling)}`,18,[base,...filling],[
    ...(veg.length?[prepVeg,`Cocina ${join(veg.slice(0,1))} con un poco de agua hasta que se ablande.`]:[]),
    'Bate el huevo y cocínalo en una sartén antiadherente hasta que esté completamente cuajado.',
    tortilla?'Calienta las tortillas y reparte el relleno.':'Tuesta el pan y sirve el relleno encima.'
   ]);
  }
  if(protein.length){
   const topping=raw.slice(0,1);
   const filling=[...protein,...topping];
   add(`${dish} de ${join(filling)}`,30,[base,...filling],[
    cookProtein(protein),
    ...(topping.length?[`Lava y prepara ${join(topping)} para servir en crudo.`]:[]),
    tortilla?'Calienta las tortillas y reparte el relleno.':'Tuesta el pan y sirve el relleno encima.'
   ]);
  }
  if(pulses.length){
   add(`${tortilla?'Tacos':'Tostadas de pan'} de ${join(pulses)}`,20,[base,...pulses],[
    'Usa la legumbre ya cocida. Si está seca, remójala y cuécela antes siguiendo el empaque.',
    'Machácala con un poco de agua de cocción y caliéntala.',
    tortilla?'Reparte la mezcla sobre tortillas calientes.':'Unta la mezcla sobre pan tostado.'
   ],'El tiempo indicado supone que la legumbre ya está cocida.');
  }
  if(dairy.length&&key(dairy[0].name)==='queso'&&raw.length){
   const filling=[...dairy,...raw.slice(0,1)];
   add(`${tortilla?'Quesadilla':'Pan tostado'} con ${join(filling)}`,12,[base,...filling],[
    prepVeg,
    tortilla?'Dobla la tortilla con queso y caliéntala por ambos lados.':'Tuesta el pan y ponle el queso encima.',
    `Agrega ${join(raw.slice(0,1))} al servir.`
   ]);
  }
 }
 if(egg.length){
  const potato=unique.find(item=>key(item.name)==='papa');
  const onion=unique.find(item=>key(item.name)==='cebolla');
  if(potato){
   const filling=[potato,...(onion?[onion]:[])];
   add(`Tortilla de ${join(filling)}`,30,[...egg,...filling],[
    'Pela la papa, córtala en láminas delgadas y cuécela en agua hasta que esté tierna. Escurre.',
    ...(onion?['Pica la cebolla y cocínala con un poco de agua hasta que se ablande.']:[]),
    'Mezcla los ingredientes cocidos con el huevo batido. Cocina en una sartén antiadherente a fuego bajo hasta que el huevo cuaje por completo.'
   ]);
  }
 }
 if(pulses.length&&raw.length){
  const foods=[...pulses,...raw.slice(0,2)];
  add(`Ensalada de ${join(foods)}`,15,foods,[
   'Usa la legumbre ya cocida y escurrida. Si está seca, prepárala antes según las indicaciones del empaque.',
   prepVeg,'Mezcla y sirve.'
  ],'El tiempo indicado supone que la legumbre ya está cocida.');
 }
 if(pasta.length){const sides=veg.slice(0,2);add(`Pasta${sides.length?' con '+join(sides):' sencilla'}`,25,[...pasta,...sides],[`Cuece ${join(pasta)} en agua según el empaque y escurre.`,...(sides.length?[prepVeg,`Cuece ${join(sides)} hasta que esté tierno y mezcla con la pasta.`]:[]),'Sirve caliente.']);}
 if(fruits.length){
  const chosen=fruits.slice(0,3);
  add(yogurt.length?`Yogur con ${join(chosen)}`:`Fruta preparada: ${join(chosen)}`,10,[...yogurt,...chosen],[
   'Lava la fruta. Pela y retira huesos o semillas que no se comen según corresponda.',
   `Corta ${join(chosen)} en trozos pequeños.`,
   yogurt.length?`Sirve la fruta con ${join(yogurt)} y mezcla al momento.`:'Mezcla y sirve la fruta al momento.'
  ]);
  const compote=fruits.filter(i=>['manzana','pera','durazno','fresa','mora','arandano','arandano rojo'].includes(key(i.name))).slice(0,2);
  if(compote.length)add(`Compota de ${join(compote)}`,25,compote,['Lava la fruta, retira las partes que no se comen y córtala.',`Cocina ${join(compote)} en una olla con un poco de agua a fuego suave hasta que se ablande.`,'Aplasta con un tenedor y sirve tibia o deja enfriar.']);
 }
 if(oats.length)add(`Avena${fruits.length?' con '+join(fruits.slice(0,1)):''}`,15,[...oats,...fruits.slice(0,1)],[`Cuece ${join(oats)} en agua según el empaque.`,...(fruits.length?['Lava o pela la fruta, retira las partes que no se comen y córtala. Agrégala al servir.']:['Sirve caliente.'])]);
 if(milk.length&&chocolate.length)add('Chocolate caliente',10,[...milk,...chocolate],[`Calienta ${join(milk)} a fuego suave, sin dejar de remover.`,`Añade ${join(chocolate)} en trozos y mezcla hasta que se derrita. Sirve con cuidado.`]);
 // Aromatics alone, flour alone, or an unknown product do not justify inventing a dish.
 const seen=new Set(previousNames.map(key));const chosen=[];
 for(const {recipe} of candidates.sort((a,b)=>a.nearest.localeCompare(b.nearest)||a.review.localeCompare(b.review)))if(!seen.has(key(recipe.name))){seen.add(key(recipe.name));chosen.push(recipe);if(chosen.length===count)break;}
 return validateRecipes({recipes:chosen,notes:chosen.length?'':candidates.length?'Ya tienes las preparaciones disponibles para estos ingredientes. Agrega otro alimento para descubrir más combinaciones.':'Agrega una base como huevo, arroz, verduras o fruta para encontrar una preparación con lo que tienes.'},inventory);
}
