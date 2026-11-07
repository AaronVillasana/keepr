import {validateInventory,validateRecipes} from './recipes.mjs';
import catalog from './food-catalog.js';
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
const dateTier=item=>!item.date?2:item.dateKind==='estimated'?1:0;
// A bounded set of culinary methods; no API call and no invented stock or ingredients.
export function planRecipes(input,{today,count=1,previousNames=[],language='es'}={}){
 if(!Number.isInteger(count)||count<1||count>3||!Array.isArray(previousNames)||previousNames.length>20||previousNames.some(n=>typeof n!=='string'||!n.trim()||n.length>100))throw new VisionError(400,'Revisa los ingredientes e intenta crear la receta de nuevo.');
 const en=language==='en';
 const tr=(es,english)=>en?english:es;
 const list=new Intl.ListFormat(en?'en':'es-MX',{style:'long',type:'conjunction'});
 const display=name=>en?(catalog.FOOD_ENGLISH.get(name)||name):name;
 const join=items=>list.format(items.map(i=>display(i.name).toLocaleLowerCase(en?'en':'es')));
 const prepVeg=tr('Lava las verduras. Pela o retira las partes que no se comen y corta en piezas pequeñas.','Wash the vegetables. Peel or remove inedible parts and cut into small pieces.');
 const notes=tr('Ajusta las porciones a la cantidad disponible. Revisa el estado de los alimentos. Solo se presupone agua; no necesitas agregar sal, aceite ni otros ingredientes.','Adjust portions to what you have and check the condition of your food. Water is the only additional ingredient needed.');
 const cookProtein=items=>tr(`Cocina ${join(items)} por separado hasta que la cocción sea completa, usando una sartén antiadherente con un poco de agua si hace falta. Sigue las instrucciones de conservación y preparación del envase.`,`Cook ${join(items)} separately until fully cooked, using a nonstick skillet and a splash of water if needed. Follow the storage and cooking directions on the package.`);

 const inventory=validateInventory(input,today).sort((a,b)=>dateTier(a)-dateTier(b)||(a.date||'9999').localeCompare(b.date||'9999'));
 const canonical=inventory.map(item=>({...item,name:catalog.canonicalFoodName(item.name)}));
 const unique=canonical.filter((item,index)=>canonical.findIndex(other=>key(other.name)===key(item.name))===index);
 const get=(group,max=3)=>unique.filter(i=>sets[group].has(key(i.name))).slice(0,max);
 const veg=get('veg'),raw=get('raw'),fruits=get('fruit'),protein=get('protein',1),pulses=get('pulses',1),egg=get('egg',1),rice=get('rice',1),tofu=get('tofu',1),dairy=get('dairy',1),yogurt=get('creamy',1),pasta=get('pasta',1),oats=get('oats',1),milk=get('milk',1),chocolate=get('chocolate',1);
 const candidates=[];
 function add(name,minutes,foods,steps,extra=''){
  const selected=[...new Map(foods.map(i=>[i.id,i])).values()];
  if(!selected.length)return;
  const recipe={name:name.slice(0,100),minutes,servings:1,ingredients:selected.map(i=>({inventoryId:i.id,amount:tr('Al gusto; ajusta a la cantidad disponible','To taste; adjust to what you have')})),steps,notes:notes+(extra?' '+extra:'')};
  const nearest=selected.reduce((date,item)=>
   item.dateKind!=='estimated'&&item.date&&item.date<date?item.date:date,'9999');
  const review=selected.reduce((date,item)=>
   item.dateKind==='estimated'&&item.date&&item.date<date?item.date:date,'9999');
  candidates.push({recipe,nearest,review});
 }
 for(const base of egg){
  for(const v of veg.slice(0,3))add(tr(`Huevos con ${join([v])}`,`Eggs with ${join([v])}`),20,[base,v], [prepVeg,tr(`Cocina ${join([v])} en una sartén antiadherente con un poco de agua hasta que esté tierno. Si necesita más tiempo, cuécelo antes en agua.`,`Cook ${join([v])} in a nonstick skillet with a splash of water until tender. If needed, boil it first.`),tr(`Bate ${join([base])} y agrégalo a la sartén. Remueve hasta que quede completamente cuajado. Sirve caliente.`,`Beat the egg and add it to the pan. Stir until fully set. Serve hot.`)]);
  add(tr('Huevo cocido','Boiled egg'),15,[base],[tr('Coloca el huevo en una olla y cúbrelo con agua.','Put the egg in a pot and cover with water.'),tr('Lleva a ebullición y cocina hasta que la clara y la yema estén firmes. Enfría antes de pelar y sirve.','Bring to a boil and cook until the white and yolk are firm. Cool before peeling and serving.')]);
 }
 if(raw.length>=2){
  const foods=raw.slice(0,3);
  add(tr(`Ensalada de ${join(foods)}`,`Salad with ${join(foods)}`),12,foods,[
   tr('Lava los vegetales y retira las partes que no se comen.','Wash the vegetables and remove inedible parts.'),
   tr(`Corta ${join(foods)} en trozos, mezcla y sirve enseguida.`,`Chop ${join(foods)}, toss and serve immediately.`)
  ]);
 }
 if(veg.length){
  add(tr(`Verduras al vapor: ${join(veg.slice(0,2))}`,`Steamed vegetables: ${join(veg.slice(0,2))}`),30,veg,[prepVeg,tr('Pon agua en una olla y coloca las verduras en una vaporera, sin sumergirlas.','Add water to a pot and place the vegetables in a steamer basket above the water.'),tr('Tapa y cocina hasta que cada verdura esté tierna. Retira primero las piezas que se cocinen más rápido y sirve.','Cover and cook until tender. Remove the fastest-cooking pieces first, then serve.')]);
  add(tr(`Sopa de ${join(veg.slice(0,2))}`,`${join(veg.slice(0,2))} soup`),35,veg,[prepVeg,tr(`Pon ${join(veg)} en una olla y añade agua hasta cubrir. Cocina a fuego suave hasta que las piezas estén tiernas.`,`Put ${join(veg)} in a pot and cover with water. Simmer until tender.`),tr('Sirve caliente con parte del agua de cocción.','Serve hot with some of the cooking liquid.')]);
 }
 for(const base of rice){
  const sides=veg.slice(0,2),foods=[base,...sides,...protein];
  add(sides.length?tr(`Arroz con ${join(sides)}`,`Rice with ${join(sides)}`):protein.length?tr(`Arroz con ${join(protein)}`,`Rice with ${join(protein)}`):tr('Arroz sencillo','Simple rice'),protein.length?45:30,foods,[tr(`Enjuaga ${join([base])} y cuécelo en agua según las indicaciones del paquete. Si ya está cocido, recaliéntalo por completo.`,`Rinse the rice and cook it in water according to the package. If already cooked, reheat thoroughly.`),...(sides.length?[prepVeg,tr(`Cuece ${join(sides)} por separado en agua hasta que esté tierno y escurre.`,`Boil ${join(sides)} separately until tender, then drain.`)]:[]),...(protein.length?[cookProtein(protein)]:[]),tr('Combina los ingredientes preparados y sirve caliente.','Combine the prepared ingredients and serve hot.')]);
 }
 for(const base of protein){
  const sides=veg.slice(0,2);
  add(tr(`${display(base.name)}${sides.length?' con '+join(sides):' a la sartén'}`,`Skillet ${display(base.name).toLowerCase()}${sides.length?' with '+join(sides):''}`),40,[base,...sides],[...(sides.length?[prepVeg,tr(`Cuece ${join(sides)} en agua hasta que esté tierno y escurre.`,`Boil ${join(sides)} until tender, then drain.`)]:[]),cookProtein([base]),tr('Sirve la preparación caliente, con los acompañamientos indicados si los hay.','Serve hot with any prepared sides.')]);
 }
 if(tofu.length){const sides=veg.slice(0,2);add(tr(`Tofu${sides.length?' con '+join(sides):' a la sartén'}`,`Skillet tofu${sides.length?' with '+join(sides):''}`),25,[...tofu,...sides],[...(sides.length?[prepVeg,tr(`Cuece ${join(sides)} hasta que esté tierno y escurre.`,`Cook ${join(sides)} until tender, then drain.`)]:[]),tr('Escurre el tofu y córtalo en cubos. Caliéntalo en una sartén antiadherente con un poco de agua.','Drain and cube the tofu. Heat in a nonstick skillet with a splash of water.'),tr('Junta los ingredientes y calienta unos minutos antes de servir.','Combine the ingredients and heat for a few minutes before serving.')]);}
 if(pulses.length){const sides=veg.slice(0,2);add(tr(`${display(pulses[0].name)}${sides.length?' con '+join(sides):' de olla'}`,`${display(pulses[0].name)}${sides.length?' with '+join(sides):' stew'}`),90,[...pulses,...sides],[tr(`Prepara ${join(pulses)} según su presentación: si está seco, sigue las instrucciones de remojo y cocción del empaque hasta que quede completamente tierno; si ya está cocido, caliéntalo por completo.`,`If using dried ${join(pulses)}, follow the package directions for soaking and cooking until tender. If already cooked, reheat thoroughly.`),...(sides.length?[prepVeg,tr(`Cuece ${join(sides)} en agua y agrégalo a la legumbre ya cocida.`,`Boil ${join(sides)} and add to the cooked legumes.`)]:[]),tr('Ajusta con agua de cocción si hace falta y sirve caliente.','Add cooking water as needed and serve hot.')],tr('El tiempo puede variar según la legumbre y si ya está cocida.','Cooking time varies depending on the legume and whether it is already cooked.'));}
 for(const base of get('bread',2)){
  const tortilla=key(base.name)==='tortilla';
  const dish=tortilla?'Tacos':tr('Tostadas de pan','Toast');
  if(egg.length){
   const filling=[...egg,...veg.slice(0,1)];
   add(tr(`${dish} de ${join(filling)}`,`${dish} with ${join(filling)}`),18,[base,...filling],[
    ...(veg.length?[prepVeg,tr(`Cocina ${join(veg.slice(0,1))} con un poco de agua hasta que se ablande.`,`Cook ${join(veg.slice(0,1))} with a splash of water until soft.`)]:[]),
    tr('Bate el huevo y cocínalo en una sartén antiadherente hasta que esté completamente cuajado.','Beat the egg and cook in a nonstick skillet until fully set.'),
    tortilla?tr('Calienta las tortillas y reparte el relleno.','Warm the tortillas and divide the filling between them.'):tr('Tuesta el pan y sirve el relleno encima.','Toast the bread and spoon the filling on top.')
   ]);
  }
  if(protein.length){
   const topping=raw.slice(0,1);
   const filling=[...protein,...topping];
   add(tr(`${dish} de ${join(filling)}`,`${dish} with ${join(filling)}`),30,[base,...filling],[
    cookProtein(protein),
    ...(topping.length?[tr(`Lava y prepara ${join(topping)} para servir en crudo.`,`Wash and prepare ${join(topping)} to serve raw.`)]:[]),
    tortilla?tr('Calienta las tortillas y reparte el relleno.','Warm the tortillas and divide the filling between them.'):tr('Tuesta el pan y sirve el relleno encima.','Toast the bread and spoon the filling on top.')
   ]);
  }
  if(pulses.length){
   add(tr(`${tortilla?'Tacos':'Tostadas de pan'} de ${join(pulses)}`,`${dish} with ${join(pulses)}`),20,[base,...pulses],[
    tr('Usa la legumbre ya cocida. Si está seca, remójala y cuécela antes siguiendo el empaque.','Use cooked legumes. If dried, soak and cook them first according to the package.'),
    tr('Machácala con un poco de agua de cocción y caliéntala.','Mash with a splash of cooking water and heat through.'),
    tortilla?tr('Reparte la mezcla sobre tortillas calientes.','Divide the mixture among warm tortillas.'):tr('Unta la mezcla sobre pan tostado.','Spread the mixture on toasted bread.')
   ],tr('El tiempo indicado supone que la legumbre ya está cocida.','The time shown assumes the legumes are already cooked.'));
  }
  if(dairy.length&&key(dairy[0].name)==='queso'&&raw.length){
   const filling=[...dairy,...raw.slice(0,1)];
   add(tr(`${tortilla?'Quesadilla':'Pan tostado'} con ${join(filling)}`,`${tortilla?'Quesadilla':'Toast'} with ${join(filling)}`),12,[base,...filling],[
    prepVeg,
    tortilla?tr('Dobla la tortilla con queso y caliéntala por ambos lados.','Fold the tortilla over the cheese and heat both sides.'):tr('Tuesta el pan y ponle el queso encima.','Toast the bread and top it with cheese.'),
    tr(`Agrega ${join(raw.slice(0,1))} al servir.`,`Add ${join(raw.slice(0,1))} just before serving.`)
   ]);
  }
 }
 if(egg.length){
  const potato=unique.find(item=>key(item.name)==='papa');
  const onion=unique.find(item=>key(item.name)==='cebolla');
  if(potato){
   const filling=[potato,...(onion?[onion]:[])];
   add(tr(`Tortilla de ${join(filling)}`,`Omelet with ${join(filling)}`),30,[...egg,...filling],[
    tr('Pela la papa, córtala en láminas delgadas y cuécela en agua hasta que esté tierna. Escurre.','Peel and thinly slice the potato. Boil until tender, then drain.'),
    ...(onion?[tr('Pica la cebolla y cocínala con un poco de agua hasta que se ablande.','Chop the onion and cook with a splash of water until soft.')]:[]),
    tr('Mezcla los ingredientes cocidos con el huevo batido. Cocina en una sartén antiadherente a fuego bajo hasta que el huevo cuaje por completo.','Mix the cooked ingredients with the beaten egg. Cook in a nonstick skillet over low heat until fully set.')
   ]);
  }
 }
 if(pulses.length&&raw.length){
  const foods=[...pulses,...raw.slice(0,2)];
  add(tr(`Ensalada de ${join(foods)}`,`Salad with ${join(foods)}`),15,foods,[
   tr('Usa la legumbre ya cocida y escurrida. Si está seca, prepárala antes según las indicaciones del empaque.','Use cooked, drained legumes. If dried, prepare them first according to the package.'),
   prepVeg,tr('Mezcla y sirve.','Toss and serve.')
  ],tr('El tiempo indicado supone que la legumbre ya está cocida.','The time shown assumes the legumes are already cooked.'));
 }
 if(pasta.length){const sides=veg.slice(0,2);add(tr(`Pasta${sides.length?' con '+join(sides):' sencilla'}`,`${sides.length?'Pasta with '+join(sides):'Simple pasta'}`),25,[...pasta,...sides],[tr(`Cuece ${join(pasta)} en agua según el empaque y escurre.`,`Cook ${join(pasta)} in water according to the package, then drain.`),...(sides.length?[prepVeg,tr(`Cuece ${join(sides)} hasta que esté tierno y mezcla con la pasta.`,`Cook ${join(sides)} until tender and toss with the pasta.`)]:[]),tr('Sirve caliente.','Serve hot.')]);}
 if(fruits.length){
  const chosen=fruits.slice(0,3);
  add(yogurt.length?tr(`Yogur con ${join(chosen)}`,`Yogurt with ${join(chosen)}`):tr(`Fruta preparada: ${join(chosen)}`,`Fresh fruit: ${join(chosen)}`),10,[...yogurt,...chosen],[
   tr('Lava la fruta. Pela y retira huesos o semillas que no se comen según corresponda.','Wash the fruit. Peel and remove any inedible pits or seeds as needed.'),
   tr(`Corta ${join(chosen)} en trozos pequeños.`,`Cut ${join(chosen)} into bite-sized pieces.`),
   yogurt.length?tr(`Sirve la fruta con ${join(yogurt)} y mezcla al momento.`,`Serve the fruit with ${join(yogurt)} and mix just before eating.`):tr('Mezcla y sirve la fruta al momento.','Toss the fruit and serve immediately.')
  ]);
  const compote=fruits.filter(i=>['manzana','pera','durazno','fresa','mora','arandano','arandano rojo'].includes(key(i.name))).slice(0,2);
  if(compote.length)add(tr(`Compota de ${join(compote)}`,`${join(compote)} compote`),25,compote,[tr('Lava la fruta, retira las partes que no se comen y córtala.','Wash and chop the fruit, removing inedible parts.'),tr(`Cocina ${join(compote)} en una olla con un poco de agua a fuego suave hasta que se ablande.`,`Simmer ${join(compote)} in a pot with a splash of water until soft.`),tr('Aplasta con un tenedor y sirve tibia o deja enfriar.','Mash with a fork and serve warm or chilled.')]);
 }
 if(oats.length)add(tr(`Avena${fruits.length?' con '+join(fruits.slice(0,1)):''}`,`Oatmeal${fruits.length?' with '+join(fruits.slice(0,1)):''}`),15,[...oats,...fruits.slice(0,1)],[tr(`Cuece ${join(oats)} en agua según el empaque.`,`Cook ${join(oats)} in water according to the package.`),...(fruits.length?[tr('Lava o pela la fruta, retira las partes que no se comen y córtala. Agrégala al servir.','Wash or peel the fruit, remove inedible parts and chop it. Add just before serving.')]:[tr('Sirve caliente.','Serve hot.')])]);
 if(milk.length&&chocolate.length)add(tr('Chocolate caliente','Hot chocolate'),10,[...milk,...chocolate],[tr(`Calienta ${join(milk)} a fuego suave, sin dejar de remover.`,`Heat ${join(milk)} gently, stirring constantly.`),tr(`Añade ${join(chocolate)} en trozos y mezcla hasta que se derrita. Sirve con cuidado.`,`Add pieces of ${join(chocolate)} and stir until melted. Serve carefully.`)]);
 // Aromatics alone, flour alone, or an unknown product do not justify inventing a dish.
 const seen=new Set(previousNames.map(key));const chosen=[];
 for(const {recipe} of candidates.sort((a,b)=>a.nearest.localeCompare(b.nearest)||a.review.localeCompare(b.review)))if(!seen.has(key(recipe.name))){seen.add(key(recipe.name));chosen.push(recipe);if(chosen.length===count)break;}
 return validateRecipes({recipes:chosen,notes:chosen.length?'':candidates.length?tr('Ya tienes las preparaciones disponibles para estos ingredientes. Agrega otro alimento para descubrir más combinaciones.','You already have the ideas for these ingredients. Add another food to discover more combinations.'):tr('Agrega una base como huevo, arroz, verduras o fruta para encontrar una preparación con lo que tienes.','Add a staple like eggs, rice, vegetables or fruit to find ideas with what you have.')},inventory);
}
