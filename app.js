'use strict';
// Las fotos se analizan en el dispositivo; el inventario se guarda localmente.
const $ = (s) => document.querySelector(s);
let language='es';
try{if(localStorage.getItem('keepr-language')==='en')language='en';}catch{}
const t=(es,en)=>language==='en'?en:es;
const englishFoodNames=FOOD_ENGLISH;
function foodLabel(name){
 const canonical=canonicalFoodName(name);
 const english=englishFoodNames.get(canonical);
 return english?t(canonical,english):name;
}
function quantityLabel(value){
 if(!value||value==='Por confirmar'||value==='To confirm')return t('Por confirmar','To confirm');
 const units={unidad:'unit',pieza:'piece',taza:'cup',cucharada:'tablespoon',cucharadita:'teaspoon',gramo:'gram',kilogramo:'kilogram',litro:'liter',mililitro:'milliliter',rebanada:'slice'};
 const match=value.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+) ([a-z]+)$/i);
 if(!match)return value;
 for(const [es,en] of Object.entries(units)){
  const pluralES=es==='unidad'?'unidades':es+'s';
  if([es,pluralES,en,en+'s'].includes(match[2].toLowerCase())){
   return match[1]+' '+(Number(match[1].replace(',','.'))===1?t(es,en):t(pluralES,en+'s'));
  }
 }
 return value;
}
function scanProgressLabel(message){
 if(language==='es')return message;
 return message.replace('Preparando el primer análisis. Puede tardar un poco…','Preparing the first scan. This may take a moment…')
  .replace('Preparando análisis','Preparing to scan')
  .replace('Ya casi está. Preparando tus fotos…','Almost ready. Preparing your photos…')
  .replace(/Analizando foto (\d+) de (\d+)/,'Scanning photo $1 of $2');
}
function updateLanguage(){
 if(document.documentElement)document.documentElement.lang=language;
 document.querySelectorAll('[data-en]').forEach(el=>{el.textContent=t(el.dataset.es,el.dataset.en);});
 const button=$('#language-toggle');
 button.textContent=t('EN','ES');
 button.setAttribute('lang',t('en','es'));
 button.setAttribute('aria-label',t('Switch to English','Cambiar a español'));
 $('#close-modal').setAttribute('aria-label',t('Cerrar ventana','Close dialog'));
}

const escapeHTML = (s) => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateIn = (n) => {const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const daysLeft = (s) => !s?Infinity:Math.round((new Date(s+'T00:00:00')-new Date(dateIn(0)+'T00:00:00'))/86400000);
let state={items:[],consumed:0};
try{const saved=JSON.parse(localStorage.getItem('keepr-v1'));if(saved&&Array.isArray(saved.items)&&saved.items.every(i=>Number.isSafeInteger(i.id)&&typeof i.name==='string'&&typeof i.quantity==='string'&&(i.date===null||/^\d{4}-\d{2}-\d{2}$/.test(i.date)&&Kitchen.validDate(i.date)))&&Number.isSafeInteger(saved.consumed)&&saved.consumed>=0&&new Set(saved.items.map(i=>i.id)).size===saved.items.length)state=saved;}catch{}
let page='inicio', query='',filter='all',previewURL=null;

// Iconografía vectorial local, sin fuentes o servicios externos.
function validFoodEmoji(value){return typeof value==='string'&&value.length<=20&&/\p{Extended_Pictographic}/u.test(value)&&!/[<>&a-z0-9]/i.test(value);}
const FOOD_ICON_PATHS={
 "Aguacate": "<path d=\"M8 5c1-4 7-4 8 0 1 5 5 7 5 11 0 4-4 6-9 6s-9-2-9-6c0-4 4-6 5-11Z\"/><circle cx=\"12\" cy=\"15\" r=\"4\"/>",
 "Ajo": "<path d=\"M11 3h3l-1 5c7-1 10 8 6 12-3 3-11 3-14-1C1 14 6 9 10 8Z\"/><path d=\"M10 9c-3 5-3 8-1 12m4-12c3 5 3 8 1 12\"/>",
 "Alcachofa": "<path d=\"m12 2 4 5 4-1-1 6 3 2-5 6H7l-5-6 3-2-1-6 4 1Z\"/><path d=\"m7 8 5 7 5-7M4 14l8 5 8-5m-8 6v3\"/>",
 "Anchoa": "<path d=\"M3 10c6-8 12-5 16 0l3-3v10l-3-3c-6 5-12 3-16-4Z\"/><path d=\"M4 10c5-2 9-2 15 1m-13-3v1m4 7 4 2\"/>",
 "Arándano": "<circle cx=\"8\" cy=\"14\" r=\"5\"/><circle cx=\"16\" cy=\"13\" r=\"5\"/><path d=\"m5 11 3 2 2-3m3 0 3 2 2-3M11 7c0-4 4-5 7-4-1 4-3 5-7 4Z\"/>",
 "Arándano rojo": "<ellipse cx=\"7\" cy=\"15\" rx=\"4\" ry=\"5\"/><ellipse cx=\"16\" cy=\"14\" rx=\"5\" ry=\"6\"/><path d=\"m5 12 2 1 2-1m4-2 3 1 3-1M10 7l4-4m0 0 5 1-3 3\"/>",
 "Arroz": "<path d=\"M3 13h18c-1 6-4 9-9 9s-8-3-9-9ZM6 10l1-2m4 2 1-2m4 2 1-2M8 5l1-2m5 2 1-2\"/>",
 "Berenjena": "<path d=\"M17 7c7 6-1 16-11 14C-1 20 3 12 12 8Z\"/><path d=\"m12 7 3 3 2-3 4 1-3-4V2m0 3-4-1\"/>",
 "Betabel": "<path d=\"M5 11c0-7 14-7 14 0s-5 9-7 9-7-2-7-9Zm7 9 2 3M9 7 6 2m6 4V1m2 6 5-4M8 12l3-1\"/>",
 "Brócoli": "<path d=\"M9 14H5a4 4 0 0 1-1-8 4 4 0 0 1 7-3 5 5 0 0 1 9 3c5 2 3 8-2 8h-3l2 8H7Z\"/><path d=\"m8 11 4 5 5-5m-5 5v6\"/>",
 "Calabacita": "<path d=\"M4 20c-4-4 4-12 11-16 4-2 7 1 5 5-4 7-12 15-16 11Z\"/><path d=\"m15 4 5 5m-4-6 2-2 4 4-2 2M6 18l10-10\"/>",
 "Calabaza": "<path d=\"M12 6c-8-4-13 12-5 15h10c8-3 3-19-5-15Zm0 0c-4 3-4 11 0 15m0-15c4 3 4 11 0 15m0-15 1-4h4\"/>",
 "Camarón": "<path d=\"M19 9c-2-8-14-8-17 0-3 9 8 16 14 9l-5-1 4-4 6 2-2-6ZM5 7l4 3m-5 2h4m-1 5 3-3M16 7l4-4m-2 5h5\"/>",
 "Camote": "<path d=\"M3 17C0 8 17 0 21 7s-7 16-14 15Z\"/><path d=\"m6 10 2 1m5-5 1 2m2 6 2-1M8 18l2-1\"/>",
 "Carne": "<path d=\"M3 10C0 3 13 0 18 5c6 5 5 14-2 16-8 3-14-4-13-11Z\"/><path d=\"M6 10c-1-4 6-7 10-3s4 9-1 11-10-3-9-8Z\"/>",
 "Carne de cerdo": "<path d=\"M4 8c3-5 11-6 15-1 4 5 3 12-4 14C7 23 1 15 4 8Z\"/><path d=\"m7 8 3 4m4-7-1 5m-5 5 6 2m3-6-2 2\"/>",
 "Carne de cordero": "<path d=\"M9 3c5-3 11 2 10 7-1 4-5 6-8 4l-4 6-3-2 5-6C5 10 5 6 9 3Z\"/><circle cx=\"13\" cy=\"8\" r=\"3\"/><path d=\"m4 18-2 3 3 1 2-2\"/>",
 "Carne de res": "<path d=\"M4 9C2 3 12 0 17 4s7 12 3 16c-5 5-18-2-16-11Z\"/><path d=\"M7 9c2-4 7-4 10 0s1 8-3 8-8-4-7-8Z\"/><circle cx=\"14\" cy=\"10\" r=\"1.5\"/>",
 "Carne molida": "<path d=\"M3 16h18v5H3ZM4 15c-2-4 2-5 4-3 0-5 5-6 6-2 4-4 9 0 5 4m-13 2 2-2m3 2 2-3m4 3 2-1\"/>",
 "Cebolla": "<path d=\"M10 6 9 2m4 4 2-4M12 7C7 4 2 12 4 17s14 6 16 0-3-13-8-10Z\"/><path d=\"M12 7c-6 4-6 10 0 14 6-4 6-10 0-14Zm0 14v2\"/>",
 "Cereza": "<circle cx=\"6\" cy=\"16\" r=\"5\"/><circle cx=\"17\" cy=\"16\" r=\"5\"/><path d=\"M6 11c4-2 5-6 6-9 3 1 4 5 5 9M12 3c5-2 8 0 9 3-4 1-7 0-9-3Z\"/>",
 "Champiñón": "<path d=\"M2 13a10 10 0 0 1 20 0Z\"/><path d=\"m9 13-1 9h8l-1-9M7 9h.1m6-3h.1m4 4h.1\"/>",
 "Chícharo": "<path d=\"M3 21C0 11 10 3 22 3c0 13-9 20-19 18Z\"/><circle cx=\"7\" cy=\"16\" r=\"2.4\"/><circle cx=\"12\" cy=\"12\" r=\"2.4\"/><circle cx=\"17\" cy=\"8\" r=\"2.4\"/>",
 "Chile": "<path d=\"M18 7c7 7-4 16-15 14 7-3 10-9 10-14Z\"/><path d=\"m13 7 3 2 2-2V4l-3-2\"/>",
 "Chile verde": "<path d=\"M7 7c-5 4-1 13 12 14-4-4-5-8-6-14Z\"/><path d=\"m7 7 3 2 3-2c-2-4 1-5 3-5m-7 9c0 3 2 5 4 6\"/>",
 "Chirimoya": "<path d=\"M12 5C0 0-1 16 12 22 25 16 24 0 12 5Z\"/><path d=\"m5 9 3 3 4-4 4 4 3-3m-13 5 3 3 3-3 3 3 3-3M12 5V1\"/>",
 "Chocolate": "<path d=\"M4 2h16v20H4Z\"/><path d=\"M4 9h16M4 15h16M12 2v20m-5-17h2m6 0h2m-10 7h2m6 0h2\"/>",
 "Cilantro": "<path d=\"M12 22V8m0 6-6-5m6 8 6-6\"/><path d=\"M12 9c-7-1-6-6-2-5 1-4 6-3 5 0 4-1 6 4-3 5ZM6 10c-5 1-7-3-4-4-1-3 4-4 5 0m11 7c6-1 7-5 3-5 0-4-5-4-5 0\"/>",
 "Col": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M4 6c9-1 12 7 12 15M3 15c7 4 16 0 16-10M9 3c-5 9 0 14 8 15\"/>",
 "Coliflor": "<path d=\"M6 17C0 15 1 8 5 7c-1-5 5-7 8-4 5-3 9 1 8 5 4 4 1 9-3 9Z\"/><path d=\"m3 16 6 6h7l6-6-10 3Z\"/><path d=\"m8 11 2-2m5-2 2 2m-4 3 1 2\"/>",
 "Durazno": "<path d=\"M12 7C1 1-2 18 10 22c5 2 15-6 11-13-2-4-6-4-9-2Z\"/><path d=\"M12 7c4 4 4 9 0 15M12 6c0-5 6-5 8-3-2 4-5 4-8 3Z\"/>",
 "Elote": "<path d=\"M8 18C2 7 8 1 12 2s9 7 4 16Z\"/><path d=\"M3 10c-1 7 3 12 9 12 7-1 10-5 9-12l-9 10ZM9 6h6m-7 4h8m-6-7v12m4-12v12\"/>",
 "Espárrago": "<path d=\"m4 22 7-17 1-3 3 5-9 16m4-9 4 1m-2-6 4 1m0 12 4-13 1-3 2 4-5 13m1-8 3 1\"/>",
 "Espinaca": "<path d=\"M4 20C2 10 7 4 20 3c0 13-6 18-16 17Z\"/><path d=\"m4 20 11-11m-7 7v-5m0 5h5\"/>",
 "Frambuesa": "<path d=\"m8 5 4 2 4-2-4-3Z\"/><circle cx=\"9\" cy=\"10\" r=\"3\"/><circle cx=\"15\" cy=\"10\" r=\"3\"/><circle cx=\"6\" cy=\"15\" r=\"3\"/><circle cx=\"12\" cy=\"15\" r=\"3\"/><circle cx=\"18\" cy=\"15\" r=\"3\"/><circle cx=\"9\" cy=\"20\" r=\"3\"/><circle cx=\"15\" cy=\"20\" r=\"3\"/>",
 "Fresa": "<path d=\"M4 8c-5 7 6 15 8 15S25 15 20 8Z\"/><path d=\"m5 7 7 2 7-2-4-1 1-4-4 3-4-3 1 4ZM8 12v1m8-1v1m-4 3v1m0 3v.1\"/>",
 "Frijol": "<path d=\"M10 3c10-4 17 16 6 19C6 25-1 13 3 8c5-6 5 5 10 3 3-1-3-5-3-8Z\"/><path d=\"M9 7c-3 4 5 10 9 7\"/>",
 "Frijol blanco": "<path d=\"M8 3C-1 3 0 19 9 22c13 4 17-13 10-16-5-2-2 9-8 8-4-1 3-11-3-11Z\"/><path d=\"M7 8c-3 5 1 10 6 10\"/>",
 "Garbanzo": "<path d=\"M7 5c-7 4-6 14 1 16s14-1 14-9c0-7-8-11-13-8L6 1Z\"/><path d=\"M8 6c-1 5 2 6 6 5l4-4m-5 5-2 6\"/>",
 "Grosella": "<path d=\"m12 2 2 8m-2-5-7 3m8 0 7-3m-7 5-5 7m6-5 4 6\"/><circle cx=\"4\" cy=\"10\" r=\"3\"/><circle cx=\"19\" cy=\"8\" r=\"3\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><circle cx=\"6\" cy=\"20\" r=\"3\"/><circle cx=\"19\" cy=\"20\" r=\"3\"/>",
 "Guayaba": "<path d=\"M11 5C1 1-2 17 8 21c9 4 16-5 12-12-3-6-6-3-9-4Z\"/><ellipse cx=\"12\" cy=\"14\" rx=\"5\" ry=\"6\"/><path d=\"M11 5V2l4-1m-5 11h.1m4 3h.1m-3 2h.1\"/>",
 "Harina": "<path d=\"M6 2h12l-1 5 3 5v10H4V12l3-5Z\"/><path d=\"M7 7h10M8 14h8m-8 4h5m-5-14h8\"/>",
 "Hojas verdes": "<path d=\"M12 22V8M12 15C2 16 1 7 2 5c9-1 10 5 10 10Zm0 3c10 0 12-7 10-12-7 0-10 5-10 12ZM12 9C7 7 8 2 12 1c5 2 5 6 0 8Z\"/>",
 "Huevo": "<path d=\"M20 14c0 5-3 8-8 8s-8-3-8-8S8 2 12 2s8 7 8 12Z\"/>",
 "Jamón": "<path d=\"M3 7c0-5 15-7 18 1v12H3Z\"/><ellipse cx=\"12\" cy=\"14\" rx=\"7\" ry=\"5\"/><path d=\"m8 13 2 2m5-3 1 2\"/>",
 "Jengibre": "<path d=\"M9 3c-5-2-5 3-3 6-5-1-6 4-2 6l5 2c-2 4 1 7 4 4l3-5c6 2 8-3 3-5l-4-2c3-6-1-9-4-4Z\"/><path d=\"m7 9 2 3m5-4 1 4m-6 5 4-1\"/>",
 "Jitomate": "<path d=\"M9 7c-4-1-6 2-6 6 0 5 4 8 9 8s9-3 9-8c0-4-3-7-6-6\"/><path d=\"m8 5 4 3 4-3m-4 3V3\"/>",
 "Kiwi": "<ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"10\"/><ellipse cx=\"12\" cy=\"12\" rx=\"3\" ry=\"4\"/><path d=\"m6 8 1 1m10-1-1 1m-4-5v2m0 12v2m-6-5 2-1m10 1-2-1\"/>",
 "Kumquat": "<ellipse cx=\"8\" cy=\"15\" rx=\"5\" ry=\"7\"/><ellipse cx=\"17\" cy=\"13\" rx=\"5\" ry=\"7\"/><path d=\"M9 8c0-4 3-6 6-5-1 4-3 5-6 5m9-2V2m-2 9h.1m-10 3h.1\"/>",
 "Leche": "<path d=\"m7 2-3 5v15h16V7l-4-5Z\"/><path d=\"M7 2v5h13M4 7h3v15m4-10h5v5h-5Z\"/>",
 "Lechuga": "<path d=\"M8 21C0 18 1 11 4 10 0 5 7 1 10 4c2-5 9-3 9 1 5 1 5 7 1 9 3 4-2 9-7 7Z\"/><path d=\"M12 22V8m0 7-5-4m5 7 5-5\"/>",
 "Limón": "<path d=\"M4 7C8 1 17 2 20 8c4 7-3 16-10 13l-5 1 1-4C1 15 1 11 4 7Z\"/><path d=\"m8 7 2-1m5 11 2-2\"/>",
 "Limón amarillo": "<path d=\"M3 14C1 4 14 0 19 6l3 1-1 4c1 8-11 13-16 7l-3-1Z\"/><path d=\"M6 12c0-4 4-6 7-6m-3 13 3-1\"/>",
 "Mango": "<path d=\"M7 4C-2 10 4 23 13 22c11-2 12-20 1-20l-7 2Z\"/><path d=\"M7 7c-4 6-1 11 3 12M14 2l3-1\"/>",
 "Mantequilla": "<path d=\"m2 14 8-5 12 5v7H2Z\"/><path d=\"M2 14h20M6 13V7l6-3 6 3v6M6 7l6 3 6-3m-6 3v4\"/>",
 "Manzana": "<path d=\"M12 8c-7-6-14 2-8 11 3 5 6 2 8 2s5 3 8-2c6-9-1-17-8-11Z\"/><path d=\"M12 7c0-4 2-5 5-5m-5 5c-4 0-5-2-5-4\"/>",
 "Mora": "<circle cx=\"8\" cy=\"8\" r=\"3\"/><circle cx=\"14\" cy=\"7\" r=\"3\"/><circle cx=\"5\" cy=\"13\" r=\"3\"/><circle cx=\"11\" cy=\"13\" r=\"3\"/><circle cx=\"17\" cy=\"12\" r=\"3\"/><circle cx=\"8\" cy=\"18\" r=\"3\"/><circle cx=\"14\" cy=\"18\" r=\"3\"/><path d=\"m11 3 5-2m-6 20 2 2\"/>",
 "Naranja": "<circle cx=\"12\" cy=\"13\" r=\"9\"/><path d=\"M12 4V1m0 3c4-4 8-2 9 0-3 3-6 2-9 0ZM6 10c-1 2-1 4 0 5\"/>",
 "Okra": "<path d=\"m4 22 3-15 7-5 4 7-9 14Z\"/><path d=\"m7 7 11 2M10 9 6 21m8-11-6 12M14 2l3-1\"/>",
 "Pan": "<path d=\"M5 10C-1 8 1 2 6 2h12c5 0 7 6 1 8v12H5Z\"/><path d=\"M8 12v6m8-6v6M6 6h12\"/>",
 "Papa": "<path d=\"M5 6C-2 14 3 22 12 22s12-8 8-15S9 0 5 6Z\"/><path d=\"m7 8 1 1m7-3 1 1m-9 9 1 1m8-3 1 1\"/>",
 "Papaya": "<path d=\"M12 2C7 3 1 13 3 18c3 7 15 6 18 0 2-5-4-15-9-16Z\"/><ellipse cx=\"12\" cy=\"14\" rx=\"4\" ry=\"6\"/><path d=\"M11 11h.1m3 3h.1m-4 3h.1\"/>",
 "Pechuga de pollo": "<path d=\"M5 5C0 10 2 21 11 22c10 1 13-6 9-13C16 3 10 1 5 5Z\"/><path d=\"M7 8c-4 4-2 9 2 11m3-13c4 2 6 5 6 9\"/>",
 "Pepino": "<path d=\"M5 20c-3-3 0-7 5-12s8-7 11-4 0 7-5 12-8 7-11 4Z\"/><path d=\"m8 17 9-9m-7 3 1 1m2 2 1 1\"/>",
 "Pera": "<path d=\"M9 5c-1 5-7 6-7 12 0 7 20 7 20 0 0-6-6-7-7-12Z\"/><path d=\"M12 5c0-4 3-4 4-4M6 16c0 2 1 3 3 4\"/>",
 "Perejil": "<path d=\"M12 22V6m0 7-6-4m6 9 6-7\"/><path d=\"m12 8-4-2 1-4 3 1 3-1 1 4Zm-6 3L2 9l1-4 4 1 2 3m9 4 4-3-1-4-4 2-1 3\"/>",
 "Pescado": "<path d=\"M2 12C7 2 15 2 19 10l4-4v12l-4-4c-4 8-12 8-17-2Z\"/><path d=\"M8 5c5 4 5 10 0 14m3-15 4-3 2 5m-10 4h.1\"/>",
 "Pimienta larga": "<path d=\"m3 20 3 3L21 7l-4-4Z\"/><path d=\"m17 3 3-2m-13 14 4 3m-1-6 4 3m-1-6 4 3m-1-6 3 2\"/>",
 "Pimiento": "<path d=\"M12 8c-7-7-13 4-7 12 2 3 5 1 7 1s5 2 7-1c6-8 0-19-7-12Z\"/><path d=\"M12 8c0-5 1-6 4-6m-7 9c-2 4-1 6 0 8m6-8c2 4 1 6 0 8\"/>",
 "Piña": "<path d=\"m8 7-3-5 6 2 1-4 2 4 6-2-4 5M6 8c-4 6-2 14 6 14s10-8 6-14Z\"/><path d=\"m6 10 11 10M5 15l7 7M11 8l9 8M6 20 17 9m-5 13 8-8M4 15l8-7\"/>",
 "Pitahaya": "<path d=\"M12 3C3 2 0 13 5 19c6 6 15 1 16-5 1-5-5-10-9-11Z\"/><path d=\"m12 3-1-3m-6 8L1 6m3 10-3 2m15 3 2 3m3-11 3 1M12 6c-5 0-8 11-1 13 7 1 9-11 1-13ZM10 10h.1m5 2h.1m-4 4h.1\"/>",
 "Plátano": "<path d=\"M20 3c0 9-5 16-14 15-2 0-3 2-1 3 11 5 19-5 17-16l-2-2Z\"/><path d=\"M6 18c7-1 10-6 12-12\"/>",
 "Pollo": "<path d=\"M8 7c-5-2-8 4-5 9s11 6 14 1 0-10-4-10l5-4 3 2-6 5\"/><path d=\"M17 3c0-4 5-3 4 0 4 0 3 5 0 4M6 12c-1 3 1 5 3 5\"/>",
 "Poro": "<path d=\"m6 22 4-13 5 1-4 13ZM10 9 8 1m5 8 2-9m-1 10 7-9m-5 11 7-6m-13 7 4 1\"/>",
 "Queso": "<path d=\"m2 12 13-9 7 9v10H2Z\"/><path d=\"M2 12h20\"/><circle cx=\"7\" cy=\"17\" r=\"2\"/><circle cx=\"17\" cy=\"18\" r=\"1\"/><path d=\"m12 8 2 1\"/>",
 "Rábano": "<path d=\"M5 10c2-6 13-6 14 1s-4 9-7 10-8-5-7-11Z\"/><path d=\"M12 21v3m-2-17L6 2m7 5 1-6m1 6 5-4m-13 9h4\"/>",
 "Salchicha": "<path d=\"M5 6c-5 5-1 15 7 16 7 1 12-6 7-10-3-2-5 2-7 0S9 2 5 6Z\"/><path d=\"m4 7-3-3m18 11 4 3M7 9l3-1m-1 7 3-2m3 5 1-3\"/>",
 "Sandía": "<path d=\"M2 9h20C21 26 3 26 2 9Z\"/><path d=\"M5 9c1 13 13 13 14 0M8 12v2m4-3v3m4-2v2m-4 3v1\"/>",
 "Tofu": "<path d=\"m3 8 9-5 9 5v12l-9 3-9-3Z\"/><path d=\"m3 8 9 4 9-4m-9 4v11m-6-7h.1m3 3h.1m8-4h.1\"/>",
 "Uva": "<circle cx=\"6\" cy=\"9\" r=\"3\"/><circle cx=\"12\" cy=\"9\" r=\"3\"/><circle cx=\"18\" cy=\"9\" r=\"3\"/><circle cx=\"9\" cy=\"15\" r=\"3\"/><circle cx=\"15\" cy=\"15\" r=\"3\"/><circle cx=\"12\" cy=\"21\" r=\"3\"/><path d=\"M12 6V2m0 2c4-4 7-2 8 0-3 3-5 3-8 0Z\"/>",
 "Yogur": "<path d=\"M4 6h16l-2 16H6Z\"/><ellipse cx=\"12\" cy=\"6\" rx=\"8\" ry=\"3\"/><path d=\"m16 4 3-3M8 13h8m-7 4h6\"/>",
 "Zanahoria": "<path d=\"M4 22 7 7c3-4 8-2 10 2l-9 12Z\"/><path d=\"m8 8 4 2m-5 4 3 1m5-9 1-5m1 6 5-4m-6 3 5 3\"/>"
};
FOOD_ICON_PATHS.Tortilla='<ellipse cx="12" cy="11" rx="9" ry="7"/><path d="M3 14c1 4 5 6 9 6s8-2 9-6M8 9h.1m5-2h.1m3 5h.1m-6 2h.1"/>';
const foodIconKeys=new Map(Object.keys(FOOD_ICON_PATHS).map(name=>[foodNormalize(name),name]));
function foodIcon(name,custom){
 const canonical=foodIconKeys.get(scanFoodKey(name))||resolveFood(name)?.name||'';
 const aliases={'Cerdo':'Carne de cerdo','Repollo':'Col','Tortilla':'Pan','Lenteja':'Frijol','Atún':'Pescado','Salmón':'Pescado','Mandarina':'Naranja','Melón':'Sandía','Coco':'Guayaba','Nopal':'Hojas verdes','Albahaca':'Perejil','Pasta':'Arroz','Avena':'Arroz'};
 const fallback='<rect x="4" y="5" width="16" height="16" rx="4"/><path d="M8 2h8M8 10h8m-8 5h5"/>';
 return `<span class="food-line-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${FOOD_ICON_PATHS[canonical]||FOOD_ICON_PATHS[aliases[canonical]]||fallback}</svg></span>`;
}
let cookbookReadyOnly=false;
let recipes=[],generatedRecipes=[],generatedSignature='',recipeSignature='',recipeError='',recipeNotes='',recipesLoading=false,recipeTimer=null,recipeController=null;
function inventoryForRecipes(){return eligible().slice(0,100).map(i=>({id:i.id,name:i.name,quantity:i.quantity,date:i.date||null,dateKind:i.dateKind||'reference'}));}
function inventorySignature(){return JSON.stringify({today:dateIn(0),items:inventoryForRecipes()});}
function recipeCacheKey(){return language==='en'?'keepr-recipes-v1-en':'keepr-recipes-v1';}
function queueRecipes(){clearTimeout(recipeTimer);if(recipeController){recipeController.abort();recipeController=null;}recipesLoading=false;recipeSignature='';recipeTimer=setTimeout(()=>{refreshRecipes();},150);}
function syncRecipeInventory(){
 const signature=inventorySignature();
 if(generatedSignature!==signature){generatedSignature=signature;try{generatedRecipes=Kitchen.readRecipeCache(localStorage.getItem(recipeCacheKey()),signature,inventoryForRecipes());}catch{generatedRecipes=[];}}
 recipes=generatedRecipes;recipeSignature=signature;
}
function persistRecipes(){try{localStorage.setItem(recipeCacheKey(),JSON.stringify({signature:generatedSignature,recipes:generatedRecipes}));}catch{toast(t('La receta está disponible; no se pudo guardar para la próxima visita.','The recipe is available now, but couldn’t be saved for next time.'));}}
function newId(){let id=Date.now();while(state.items.some(i=>i.id===id))id++;return id;}
async function refreshRecipes(create=false){
 const signature=inventorySignature();
 if(!create&&recipeSignature===signature)return;
 if(!create){syncRecipeInventory();recipeError='';recipeNotes='';recipesLoading=false;if(page==='recetas')renderRecipes();return;}
 if(recipesLoading)return;
 syncRecipeInventory();const items=inventoryForRecipes();if(!items.length){toast(t('Agrega alimentos a tu inventario para crear una receta.','Add food to your inventory to find ideas.'));return;}
 const controller=new AbortController();recipeController=controller;recipeError='';recipeNotes='';recipesLoading=true;if(page==='recetas')renderRecipes();
 const timer=setTimeout(()=>controller.abort(),125000);
 try{
  const res=await fetch('/api/recipes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,today:dateIn(0),count:3,language,previousNames:recipes.map(r=>r.name)}),signal:controller.signal});
  if(!(res.headers.get('content-type')||'').includes('application/json'))throw new Error('No se pudo conectar al servicio de recetas. Tus ideas actuales siguen disponibles.');
  const data=await res.json();if(!res.ok)throw new Error(data.error||'No pudimos crear la receta. Intenta de nuevo.');
  if(!Array.isArray(data.recipes)||data.recipes.length>3)throw new Error('La respuesta no contiene una receta válida.');
  if(signature!==inventorySignature()||recipeController!==controller)return;
  if(!data.recipes.length){recipeNotes=data.notes||t('No encontramos una combinación adecuada con estos ingredientes.','We couldn’t find a suitable combination with these ingredients.');return;}
  const names=new Set(recipes.map(r=>normalized(r.name)));
  let id=Math.max(Date.now(),...recipes.map(r=>r.id+1));
  const incoming=data.recipes.flatMap(r=>{
   const name=normalized(r.name);
   if(names.has(name))return [];
   names.add(name);
   return [{id:id++,name:r.name,time:r.minutes,servings:r.servings,sourceIds:r.ingredients.map(i=>i.inventoryId),needs:r.ingredients.map(i=>items.find(x=>x.id===i.inventoryId)?.name||''),amounts:r.ingredients.map(i=>i.amount),steps:r.steps,pantry:r.notes,local:false}];
  });
  const checked=Kitchen.readRecipeCache(JSON.stringify({signature,recipes:incoming}),signature,items);
  if(checked.length!==incoming.length)throw new Error('La receta no coincide con tu inventario. Intenta de nuevo.');
  if(checked.length){
   generatedRecipes=[...checked,...generatedRecipes].slice(0,12);
   persistRecipes();
   toast(t('Sugerencias listas.','Suggestions ready.'));
  }
  recipeNotes=checked.length?data.notes||'':t('Ya tienes esas sugerencias. Prueba con otros ingredientes.','You already have those ideas. Try different ingredients.');
  syncRecipeInventory();
 }catch(e){if(recipeController===controller)recipeError=language==='en'?(e.name==='AbortError'?'This took longer than expected. Try again.':'Something went wrong. Try again in a moment.'):e.name==='AbortError'?'La receta tardó más de lo esperado. Puedes volver a intentarlo.':e.message==='Failed to fetch'?'No hay conexión con el servicio. Tus recetas actuales siguen disponibles.':e.message;}
 finally{clearTimeout(timer);if(recipeController===controller){recipeController=null;recipesLoading=false;if(page==='recetas')renderRecipes();}}
}
function missingIngredients(recipe){
 return recipe.needs.filter(name=>!matches(recipe).some(item=>scanFoodKey(item.name)===scanFoodKey(name)));
}
function recipeRow(r,index){
 const missing=missingIngredients(r);
 const priority=recipePriority(r);
 const reason=priority&&daysLeft(priority.date)<=2?t('Aprovecha primero: ','Use first: ')+foodLabel(priority.name):'';
 const status=missing.length?t('Te falta: ','Missing: ')+missing.map(foodLabel).join(', '):t('Puedes cocinarla','Ready to cook');
 const visual=r.local?foodIcon(r.needs[0]):String(index+1).padStart(2,'0');
 return `<article class="recipe-row"><span class="recipe-index" aria-hidden="true">${visual}</span><div class="recipe-row-main"><div class="recipe-row-meta"><span>${r.time} min</span>${r.local?`<span class="cookbook-status ${missing.length?'is-missing':''}">${escapeHTML(status)}</span>`:''}</div><h3>${escapeHTML(r.name)}</h3><p>${r.needs.map(n=>escapeHTML(foodLabel(n))).join(' · ')}</p>${reason?`<small class="recipe-reason">${escapeHTML(reason)}</small>`:''}</div><button class="recipe-open" data-recipe="${r.id}" aria-label="${t('Ver preparación de','View preparation for')} ${escapeHTML(r.name)}">${t('Ver preparación','View recipe')} <span aria-hidden="true">→</span></button></article>`;
}
function renderRecipes(){
 if(recipeSignature!==inventorySignature()&&!recipesLoading){refreshRecipes();return;}
 const items=inventoryForRecipes(),created=orderedRecipes();
 const cookbook=Kitchen.cookbook(language);
 const entries=cookbookReadyOnly?cookbook.filter(r=>!missingIngredients(r).length):cookbook;
 setScreenContent(`${sectionHeading('recetas')}
 <section class="recipe-create" aria-label="${t('Buscar ideas con mi inventario','Find ideas using my inventory')}"><div class="recipe-create-copy"><span class="eyebrow">${t('Tu inventario es el punto de partida','Your inventory is the starting point')}</span><h2>${t('Una receta con lo que tienes.','A recipe using what you have.')}</h2><p>${items.length?t('Elegimos solo lo que necesita cada plato y damos prioridad a las fechas más cercanas.','We pick only what each dish needs and prioritize foods with the nearest dates.'):t('Agrega alimentos para recibir ideas personalizadas.','Add food to get personalized ideas.')}</p></div><div class="recipe-create-action">${items.length?`<button class="primary" id="refresh-recipes" ${recipesLoading?'disabled':''}>${recipesLoading?t('Buscando ideas…','Finding ideas…'):t('Buscar ideas','Find ideas')}</button><small>${t('Hasta 3 ideas por búsqueda.','Up to 3 ideas per search.')}</small>`:`<button class="primary" data-go="inventario">${t('Ver inventario','View inventory')}</button>`}</div></section>
 ${recipesLoading?`<p class="recipe-progress" role="status">${t('Buscando una combinación con tus ingredientes…','Finding a combination with your ingredients…')}</p>`:''}
 ${recipeError?`<div class="recipe-feedback error" role="alert"><strong>${t('No pudimos crear la receta.','We couldn’t create a recipe.')}</strong><p>${escapeHTML(recipeError)}</p><button class="text-button" id="retry-recipe">${t('Volver a intentar','Try again')} →</button></div>`:''}
 ${recipeNotes?`<p class="notice" role="status">${escapeHTML(recipeNotes)}</p>`:''}
 ${created.length?`<div class="recipe-list-heading"><h2>${t('Sugerencias para tu inventario','Suggestions for your inventory')}</h2></div><div class="recipe-list">${created.map(recipeRow).join('')}</div>`:''}
 <section class="cookbook"><div class="recipe-list-heading"><h2>Keepr Cookbook</h2><span>${cookbook.length} ${t('recetas','recipes')}</span></div>
 <p class="subtle">${t('Explora el recetario y revisa qué puedes preparar con lo que tienes.','Browse the cookbook and see what you can make with what you have.')}</p>
 <div class="cookbook-filters" role="group" aria-label="${t('Filtrar recetas','Filter recipes')}">
 <button class="secondary" id="cookbook-all" aria-pressed="${!cookbookReadyOnly}">${t('Todas las recetas','All recipes')}</button>
 <button class="secondary" id="cookbook-ready" aria-pressed="${cookbookReadyOnly}">${t('Puedo cocinar ahora','Ready to cook')}</button></div>
 <div class="recipe-list">${entries.length?entries.map(recipeRow).join(''):`<p class="notice">${t('Agrega ingredientes para ver qué puedes cocinar, o explora todas las recetas.','Add ingredients to see what you can cook, or browse all recipes.')}</p>`}</div></section>`);
 if($('#refresh-recipes'))$('#refresh-recipes').onclick=()=>refreshRecipes(true);
 if($('#retry-recipe'))$('#retry-recipe').onclick=()=>refreshRecipes(true);
 $('#cookbook-all').onclick=()=>setCookbookFilter(false);
 $('#cookbook-ready').onclick=()=>setCookbookFilter(true);
}
function setCookbookFilter(ready){
 cookbookReadyOnly=ready;
 renderRecipes();
 $(ready?'#cookbook-ready':'#cookbook-all').focus({preventScroll:true});
}
const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const eligible=()=>state.items.filter(i=>Kitchen.allowed(i,dateIn(0)));
const matches=r=>r.sourceIds?r.sourceIds.map(id=>eligible().find(i=>i.id===id)).filter(Boolean):r.needs.map(n=>eligible().filter(i=>scanFoodKey(n)===scanFoodKey(i.name)).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'))[0]).filter(Boolean);
function compareFoodDates(a,b){
 const tier=i=>!i.date?2:i.dateKind==='estimated'?1:0;
 return tier(a)-tier(b)||(a.date||'9999').localeCompare(b.date||'9999');
}
function recipePriority(recipe){
 return matches(recipe).filter(i=>i.date).sort(compareFoodDates)[0];
}
const orderedRecipes=()=>[...recipes].sort((a,b)=>{
 const first=recipePriority(a),second=recipePriority(b);
 return first&&second?compareFoodDates(first,second):Number(Boolean(second))-Number(Boolean(first));
});
function save(){queueRecipes();try{localStorage.setItem('keepr-v1',JSON.stringify(state));}catch{toast(t('No se pudo guardar. Los cambios durarán hasta cerrar la página.','Couldn’t save. Changes will last until you close the page.'));}}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
// Check-in intervals from the day an item is added, not food safety deadlines.
const reviewIntervals=[
 [1,['Pollo','Pechuga de pollo','Pescado','Camarón','Carne molida','Carne','Anchoa','Salchicha']],
 [2,['Carne de res','Carne de cerdo','Carne de cordero','Fresa','Frambuesa','Mora','Hojas verdes']],
 [3,['Espinaca','Lechuga','Champiñón','Aguacate','Cilantro','Perejil','Brócoli','Jitomate','Pepino','Chirimoya','Guayaba','Papaya','Durazno','Leche','Jamón','Tofu','Elote','Espárrago','Okra']],
 [7,['Betabel','Zanahoria','Col','Cebolla','Ajo','Papa','Camote','Jengibre','Manzana','Naranja','Limón','Limón amarillo','Mantequilla','Huevo','Queso','Yogur']],
 [14,['Arroz','Frijol','Frijol blanco','Garbanzo','Harina','Chocolate','Pimienta larga']]
];
function suggestedReview(name){
 const exact=resolveFood(name);
 const food=exact&&exact.method!=='approximate'?exact.name:[...englishFoodNames].find(([,english])=>foodNormalize(english)===foodNormalize(name))?.[0];
 if(!food)return null;
 return dateIn(reviewIntervals.find(([,foods])=>foods.includes(food))?.[0]??5);
}
function badge(item){
 if(!item.date)return ['',''];
 const days=daysLeft(item.date);
 if(item.dateKind==='estimated')return ['soon',days<=0?t('Revisar hoy · estimado','Check today · estimated'):days===1?t('Revisar en 1 día aprox.','Check in about 1 day'):t(`Revisar en ${days} días aprox.`,`Check in about ${days} days`)];
 if(days<0)return ['expired',t('Fecha superada','Past its date')];
 if(days>4)return ['',''];
 return [days<=2?'urgent':'soon',days===0?t('Fecha: hoy','Due today'):t(`Fecha en ${days} día${days===1?'':'s'}`,`Due in ${days} day${days===1?'':'s'}`)];
}
function card(item){
 const [style,label]=badge(item);
 return `<article class="food-card compact-food"><div class="emoji" aria-hidden="true">${foodIcon(item.name,item.emoji)}</div><div class="food-card-copy"><h3>${escapeHTML(foodLabel(item.name))}</h3>${!['Por confirmar','To confirm'].includes(item.quantity)?`<p>${escapeHTML(quantityLabel(item.quantity))}</p>`:''}<div class="food-card-meta">${label?`<span class="badge ${style}">${label}</span>`:''}<button class="text-button food-details" data-detail="${item.id}" aria-label="${t('Ver detalles de','View details for')} ${escapeHTML(foodLabel(item.name))}">${t('Ver detalles','View details')} →</button></div></div></article>`;
}
function showFood(id){
 const item=state.items.find(i=>i.id===id);if(!item)return;
 const date=item.date?item.date.split('-').reverse().join('/'):t('Sin fecha','No date');
 const label=item.dateKind==='estimated'?t('Fecha aproximada de revisión','Estimated check date'):t('Fecha de vencimiento','Expiration date');
 openModal(t('INVENTARIO','INVENTORY'),`<h2>${escapeHTML(foodLabel(item.name))}</h2><p>${t('Cantidad','Quantity')}: ${escapeHTML(quantityLabel(item.quantity))}</p><p>${label}: ${escapeHTML(date)}</p>${item.dateKind==='estimated'?`<p class="subtle">${t('Es un recordatorio para revisar el alimento. No indica caducidad.','This is a reminder to check the food. It does not indicate expiration.')}</p>`:''}<div class="modal-actions"><button class="text-button" data-remove="${id}">${t('Eliminar','Delete')}</button>${Kitchen.allowed(item,dateIn(0))?`<button class="secondary" data-consume="${id}">${t('Marcar consumido','Mark as consumed')}</button>`:''}<button class="primary" data-edit="${id}">${t('Editar alimento','Edit food')}</button></div>`);
}
function render(){page=['inicio','inventario','recetas'].includes(location.hash.slice(1))?location.hash.slice(1):'inicio';document.querySelectorAll('nav a').forEach(a=>{a.classList.toggle('active',a.dataset.page===page);a.setAttribute('aria-current',a.dataset.page===page?'page':'false');});$('#nav-count').textContent=state.items.length;$('#nav-count').hidden=!state.items.length;$('#breadcrumb').textContent={inicio:t('Mi cocina','My kitchen'),inventario:t('Mi inventario','My inventory'),recetas:t('Qué cocinar','What to cook')}[page];
if(page==='inicio')renderHome();if(page==='inventario')renderInventory();if(page==='recetas')renderRecipes();}
const headerPhotos=[
 ['keepr-portada.webp',true],
 ['market.jpg',false],
 ['kitchen.webp',true]
];
const headerImages=new Map();
function headerPhoto(photo,hasPlate){
 const layer=subject=>`<img data-header-photo="${photo}" alt=""${subject?' class="photo-subject" aria-hidden="true"':''}>`;
 return layer(false)+(hasPlate?layer(true):'');
}
function headerImageKey(photo,subject){return photo+(subject?':subject':'');}
function setScreenContent(html){
 $('#content').innerHTML=html;
 for(const slot of document.querySelectorAll('#content [data-header-photo]')){
  const photo=slot.dataset.headerPhoto;
  const key=headerImageKey(photo,slot.classList.contains('photo-subject'));
  const image=headerImages.get(key);
  if(image){
   image.fetchPriority='high';
   slot.replaceWith(image);
  }else{
   slot.fetchPriority='high';
   slot.src='/assets/'+photo;
   headerImages.set(key,slot);
  }
 }
}
function warmHeaderPhotos(){
 if(!window.Image)return;
 for(const [photo,hasPlate] of headerPhotos){
  for(const subject of hasPlate?[false,true]:[false]){
   const key=headerImageKey(photo,subject);
   if(headerImages.has(key))continue;
   const image=new window.Image();
   image.alt='';
   image.fetchPriority='low';
   if(subject){
    image.className='photo-subject';
    image.setAttribute('aria-hidden','true');
   }
   image.src='/assets/'+photo;
   headerImages.set(key,image);
   image.decode?.().catch(()=>{
    if(headerImages.get(key)===image)headerImages.delete(key);
   });
  }
 }
}
function sectionHeading(section){
 const inventory=section==='inventario';
 const photo=inventory?headerPhotos[1]:headerPhotos[2];
 return `<div class="welcome photo-heading"><div class="section-art" aria-hidden="true">${headerPhoto(...photo)}</div><div><p class="eyebrow">${inventory?t("MI COCINA","MY KITCHEN"):t("RECETAS","RECIPES")}</p><h1>${inventory?t("Tu inventario","Your inventory"):t("Ideas para hoy","Ideas for today")}</h1><p>${inventory?t("Ten a la mano lo que hay en tu refri y despensa.","Keep track of what’s in your fridge and pantry."):t("Decide qué cocinar con los ingredientes que ya tienes.","Decide what to cook with the ingredients you already have.")}</p></div>${inventory&&state.items.length?`<button class="primary" data-add>${t('+ Agregar alimentos','+ Add food')}</button>`:''}</div>`;
}
function emptyInventory(){
 return `<section class="start-panel"><div class="start-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 10h16M8 6v1m0 7v3"/><rect x="4" y="3" width="16" height="18" rx="3"/></svg></div><h2>${t('Tu inventario está vacío','Your inventory is empty')}</h2><p>${t('Escanea tus alimentos o agrega uno a mano para empezar.','Scan your food or add an item manually to get started.')}</p></section><div class="start-actions"><button class="primary" data-scan>${t('Escanear alimentos','Scan food')}</button><button class="text-button" data-manual><svg class="action-symbol" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> ${t('Agregar a mano','Add manually')}</button></div>`;
}
function renderHome(){
 const hasItems=state.items.length>0;
 const upcoming=eligible().filter(i=>i.date&&daysLeft(i.date)<=2).sort(compareFoodDates).slice(0,3);
 setScreenContent(`<div class="dashboard-top home-simple"><section class="hero"><div class="hero-copy"><h1>${t("¿Qué cocinamos ","What are we cooking ")}<em>${t("hoy?","today?")}</em></h1><p>${t("Encuentra ideas para cocinar con lo que ya tienes en casa.","Find ideas for cooking with what you already have at home.")}</p><div class="home-actions">${hasItems?`<button class="hero-button" data-find-ideas>${t("Buscar ideas para cocinar","Find cooking ideas")}</button><button class="text-button" data-scan>${t("Escanear más","Scan more")}</button>`:`<button class="hero-button" data-scan><svg class="action-symbol" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9V6a2 2 0 0 1 2-2h3m6 0h3a2 2 0 0 1 2 2v3m0 6v3a2 2 0 0 1-2 2h-3m-6 0H6a2 2 0 0 1-2-2v-3m0-3h16"/></svg> ${t("Escanear alimentos","Scan food")}</button><button class="text-button" data-manual><svg class="action-symbol" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> ${t("Agregar a mano","Add manually")}</button>`}</div></div><div class="hero-art">${headerPhoto(...headerPhotos[0])}</div></section></div>
 <section class="daily-panel home-priority"><div class="home-priority-heading">${foodIcon("Manzana")}<div><h2>${t("Aprovecha primero","Use first")}</h2>${upcoming.length?'':`<p>${t("Aquí verás qué alimentos conviene revisar pronto.","See which foods are worth checking soon.")}</p>`}</div></div>${upcoming.length?`<div class="priority-list">${upcoming.map(i=>`<button class="priority-item" data-detail="${i.id}"><span class="priority-emoji">${foodIcon(i.name,i.emoji)}</span><strong>${escapeHTML(foodLabel(i.name))}</strong><span class="priority-date">${badge(i)[1]}</span></button>`).join('')}</div>`:''}<a class="text-button" href="#inventario">${t("Ver inventario","View inventory")} →</a></section>`);
}
function renderInventory(){
 if(!state.items.length){
  setScreenContent(`${sectionHeading('inventario')}${emptyInventory()}`);
  return;
 }
 setScreenContent(`${sectionHeading('inventario')}<div class="toolbar"><input id="search" aria-label="${t("Buscar alimento","Search food")}" placeholder="${t("Buscar en mi inventario…","Search my inventory…")}" value="${escapeHTML(query)}"><select id="filter" aria-label="${t("Filtrar por urgencia","Filter by urgency")}"><option value="all">${t("Todos los alimentos","All food")}</option><option value="urgent">${t("Usar primero","Use first")}</option><option value="fresh">${t("Sin urgencia inmediata","No immediate urgency")}</option><option value="expired">${t("Fecha superada","Past its date")}</option><option value="pending">${t("Sin fecha","No date")}</option></select></div><div class="grid" id="inventory-grid"></div>`);$('#filter').value=filter;renderItems();$('#search').oninput=e=>{query=e.target.value;renderItems();};$('#filter').onchange=e=>{filter=e.target.value;renderItems();};}
function renderItems(){const items=state.items.filter(i=>(foodSearch(i.name,query)||foodNormalize(foodLabel(i.name)).includes(foodNormalize(query)))).filter(i=>{const d=daysLeft(i.date);return filter==='all'||filter==='urgent'&&(i.dateKind==='estimated'?d<=2:d>=0&&d<=2)||filter==='fresh'&&Number.isFinite(d)&&d>2||filter==='expired'&&d<0&&i.dateKind!=='estimated'||filter==='pending'&&!i.date;}).sort(compareFoodDates);$('#inventory-grid').innerHTML=items.length?items.map(card).join(''):`<div class="empty"><h3>${t('No hay alimentos para mostrar','No food to show')}</h3><p>${t('Prueba otra búsqueda o agrega un alimento.','Try a different search or add food.')}</p><button class="secondary" data-add>${t('Agregar alimento','Add food')}</button></div>`;}
function openModal(title,body){$('#modal-kicker').textContent=title;$('#modal-body').innerHTML=body;if(!$('#modal').open)$('#modal').showModal();}
function closeModal(){$('#modal').close();if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}}
function addOptions(){openModal(t("AGREGAR A MI COCINA","ADD TO MY KITCHEN"),`<h2>${t("¿Qué hay en tu refri?","What’s in your fridge?")}</h2><p>${t("Elige cómo quieres agregar tus alimentos.","Choose how to add your food.")}</p><div class="modal-actions"><button class="secondary" id="manual">${t("Agregar manualmente","Add manually")}</button><button class="primary" id="photo">${t("Analizar fotos","Analyze photos")}</button></div>`);$('#manual').onclick=()=>editItem();$('#photo').onclick=photoFlow;}
function editItem(id){const item=state.items.find(i=>i.id===id);openModal(item?t("EDITAR ALIMENTO","EDIT FOOD"):t("REGISTRO MANUAL","MANUAL ENTRY"),`<h2>${item?t("Actualiza tu alimento","Update your food item"):t("Agregar alimento","Add food")}</h2><form id="food-form"><label>${t("Nombre","Name")}<input id="food-name" required maxlength="100" value="${escapeHTML(item?foodLabel(item.name):'')}" placeholder="${t("Ej. Jitomate","e.g. Tomato")}" list="food-suggestions"></label><datalist id="food-suggestions">${FOOD_CATALOG.map(f=>`<option value="${escapeHTML(foodLabel(f.name))}"></option>`).join('')}</datalist><div id="food-recognition" class="recognition" aria-live="polite"></div><details class="manual-details" ${item?'open':''}><summary>${t("Cantidad y fecha de vencimiento (opcional)","Quantity and expiration date (optional)")}</summary><div class="form-row"><label>${t("Cantidad (opcional)","Quantity (optional)")}<input id="food-quantity" maxlength="100" value="${escapeHTML(item?.quantity==='Por confirmar'?'':item?quantityLabel(item.quantity):'')}" placeholder="${t("Ej. 3 piezas","e.g. 3 pieces")}"></label><label>${t("Fecha de vencimiento (opcional)","Expiration date (optional)")}<input id="food-date" type="date" value="${item?.dateKind==='estimated'?'':item?.date||''}"></label></div><p class="subtle">${t("Si dejas la fecha vacía, Keepr sugiere cuándo revisar los alimentos que reconoce.","If you leave the date blank, Keepr suggests when to check recognized foods.")}</p></details><div class="modal-actions"><button class="secondary" type="button" id="cancel-form">${t("Cancelar","Cancel")}</button><button class="primary" type="submit">${t("Guardar alimento","Save food")}</button></div></form>`);$('#food-name').oninput=updateRecognition;updateRecognition();$('#cancel-form').onclick=closeModal;$('#food-form').onsubmit=e=>{e.preventDefault();const enteredName=$('#food-name').value.trim(),enteredQuantity=$('#food-quantity').value.trim();const name=item&&enteredName===foodLabel(item.name)?item.name:enteredName,quantity=item&&enteredQuantity===quantityLabel(item.quantity)?item.quantity:enteredQuantity||'Por confirmar',labelDate=$('#food-date').value; if(!name){toast(t("Escribe el nombre del alimento.","Enter the food name."));return;}const review=labelDate?null:item?.dateKind==='estimated'&&item.name===name?item.date:!item||item.name!==name?suggestedReview(name):null;const date=labelDate||review||null;const data={id:item?.id||newId(),name,quantity,date,dateKind:review?'estimated':labelDate?(item?.date===labelDate&&item.dateKind!=='estimated'?item.dateKind:'reference'):'unknown',dateEstimateNote:item&&date===item.date?item.dateEstimateNote:null,quantitySource:item&&quantity===item.quantity?item.quantitySource:'manual',emoji:resolveFood(name)?.emoji||(item?.name===name&&validFoodEmoji(item?.emoji)?item.emoji:'🍽️')};if(item)state.items=state.items.map(i=>i.id===id?data:i);else state.items.push(data);save();closeModal();render();toast(t('Alimento guardado.','Food saved.'));};}
function updateRecognition(){const name=$('#food-name').value.trim(),food=resolveFood(name);$('#food-recognition').innerHTML=name?`<span class="recognition-emoji">${foodIcon(name)}</span><div>${food?`${t("Asociado a ","Matched to ")}<strong>${escapeHTML(foodLabel(food.name))}</strong>${food.method==='approximate'?t(" · coincidencia aproximada"," · approximate match"):''}`:t("Alimento personalizado","Custom item")}<small>${food?t("Conservaremos el nombre que escribiste.","We’ll keep the name you entered."):t("Puedes guardarlo con este nombre.","You can save it under this name.")}</small></div>`:t("Escribe un alimento para ver su icono.","Enter a food name to see its icon.");}
let photoSession=0,analysisController=null;
async function prepareImage(file){
 if(!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type)&&!(file.type===''&&/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name||'')))throw new Error(t("Usa una foto JPG, PNG, WebP o una captura de la cámara.","Choose a JPG, PNG, WebP, or camera photo."));
 if(file.size>20*1024*1024)throw new Error(t("Cada archivo debe pesar como máximo 20 MB.","Each file must be 20 MB or smaller."));
 const objectURL=URL.createObjectURL(file);
 try{const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(t("No se pudo abrir esta foto. Prueba tomarla de nuevo o elegir una imagen JPG.","Couldn’t open this photo. Retake it or choose a JPG.")));i.src=objectURL;});
 const scale=Math.min(1,2048/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.9);
 }finally{URL.revokeObjectURL(objectURL);}
}
async function photoFlow(){
 const session=++photoSession;let images=[],ready=false,selectionVersion=0,preparing=false,analyzing=false;
 openModal(t("AGREGAR DESDE UNA FOTO","ADD FROM A PHOTO"),`<h2>${t("Fotografía tus alimentos.","Take a photo of your food.")}</h2><p>${t("Sube hasta 3 fotos. Acerca la cámara a los alimentos y procura buena iluminación.","Add up to 3 photos. Get close to the food and use good lighting.")}</p><div class="upload-box photo-capture-box"><div class="photo-source-actions"><button type="button" class="primary photo-camera" id="take-photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 1-2h6l1 2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><circle cx="12" cy="12" r="4"/></svg>${t("Tomar foto","Take photo")}</button><button type="button" class="secondary" id="choose-photos">${t("Elegir de la galería","Choose from gallery")}</button></div><input id="camera-input" type="file" accept="image/*" capture="environment" aria-label="${t("Tomar foto con la cámara trasera","Take a photo with the rear camera")}" hidden><input id="photo-input" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="${t("Elegir fotos de la galería","Choose photos from the gallery")}" hidden><p class="photo-source-hint">${t("En el celular, Tomar foto abre la cámara. También puedes elegir imágenes guardadas.","On your phone, Take photo opens the camera. You can also choose saved photos.")}</p><div id="photo-previews" class="photo-previews"></div><p id="photo-count" class="photo-count">${t("0 de 3 fotos","0 of 3 photos")}</p></div><p id="vision-status" class="photo-status" role="status" hidden></p><p class="subtle">${t("Revisa los nombres antes de guardar. Puedes completar las cantidades y las fechas después.","Review the names before saving. You can add quantities and dates later.")}</p><details class="detector-coverage"><summary>${t("Qué puede reconocer · 82 alimentos","What Keepr can recognize · 82 foods")}</summary><p>${KeeprDetection.coverage.map(name=>escapeHTML(foodLabel(name))).join(', ')}.</p><p>${t("Si falta un alimento, puedes agregarlo manualmente.","If an item is missing, you can add it manually.")}</p></details><div class="modal-actions"><button class="secondary" id="photo-manual">${t("Agregar manualmente","Add manually")}</button><button class="primary" id="analyze-photos" disabled>${t("Analizar alimentos →","Analyze food →")}</button></div>`);
 $('#photo-manual').onclick=()=>{photoSession++;analysisController?.abort();editItem();};
 const input=$('#photo-input'),camera=$('#camera-input'),cameraButton=$('#take-photo'),galleryButton=$('#choose-photos'),button=$('#analyze-photos'),status=$('#vision-status'),previews=$('#photo-previews');
 function controls(){status.hidden=!status.textContent;const blocked=preparing||analyzing;button.disabled=blocked||!ready||!images.length;cameraButton.disabled=galleryButton.disabled=blocked||images.length>=3;input.disabled=camera.disabled=blocked||images.length>=3;previews.querySelectorAll('button').forEach(b=>b.disabled=blocked);}
 function renderPhotos(){previews.innerHTML=images.map((src,i)=>`<figure class="selected-photo"><img src="${src}" alt="${t("Foto ","Photo ")}${i+1}${t(" seleccionada"," selected")}"><button type="button" data-remove-photo="${i}" aria-label="${t("Quitar foto ","Remove photo ")}${i+1}">×</button><figcaption>${t("Foto ","Photo ")}${i+1}</figcaption></figure>`).join('');$('#photo-count').textContent=`${images.length} ${t("de 3 fotos","of 3 photos")}`;controls();}
 async function selectPhotos(files){if(!files.length)return;if(preparing||analyzing)return;if(images.length+files.length>3){status.textContent=t("Puedes agregar hasta 3 fotos. Quita una antes de agregar más.","You can add up to 3 photos. Remove one before adding more.");status.hidden=false;return;}const version=++selectionVersion;preparing=true;controls();status.textContent=t("Preparando fotos…","Preparing photos…");status.hidden=false;try{const prepared=[];for(const file of files)prepared.push(await prepareImage(file));if(session!==photoSession||version!==selectionVersion)return;images.push(...prepared);renderPhotos();status.textContent=ready?`${images.length} ${t("foto(s) listas para analizar.","photo(s) ready to scan.")}`:t("Fotos preparadas. Puedes agregarlas manualmente si el detector no está disponible.","Photos are ready. You can add items manually if scanning is unavailable.");}catch(e){if(session===photoSession&&version===selectionVersion)status.textContent=e.message;}finally{if(session===photoSession&&version===selectionVersion){preparing=false;controls();}}}
 input.onchange=()=>{const files=[...input.files];input.value='';return selectPhotos(files);};camera.onchange=()=>{const files=[...camera.files];camera.value='';return selectPhotos(files);};
 cameraButton.onclick=()=>camera.click();galleryButton.onclick=()=>input.click();
 previews.onclick=e=>{const target=e.target.closest('[data-remove-photo]');if(!target||preparing||analyzing)return;const index=Number(target.dataset.removePhoto);if(!Number.isInteger(index)||index<0||index>=images.length)return;images.splice(index,1);renderPhotos();status.textContent=images.length?`${images.length} ${t("foto(s) listas para analizar.","photo(s) ready to scan.")}`:t("Toma una foto o elige imágenes de la galería.","Take a photo or choose images from your gallery.");};
 button.onclick=async()=>{if(!ready||!images.length||preparing||analyzing)return;analyzing=true;controls();button.textContent=t("Analizando…","Analyzing…");status.textContent=t("Preparando análisis…","Preparing to scan…");status.hidden=false;analysisController=new AbortController();const controller=analysisController;const timeout=setTimeout(()=>controller.abort(),300000);try{const data=await window.KeeprDetector.analyze(images,{signal:controller.signal,onProgress:message=>{if(session===photoSession)status.textContent=scanProgressLabel(message);}});if(!Array.isArray(data.items)||!Array.isArray(data.notes))throw new Error(t("El detector devolvió una respuesta inválida.","The scanner returned an invalid response."));if(session!==photoSession)return;reviewDetected(data);}catch(e){if(session===photoSession){status.textContent=e.name==='AbortError'?t("El análisis se canceló o tardó demasiado. Prueba con una sola foto más cercana.","Scanning was canceled or timed out. Try one closer photo."):t(e.message,'Couldn’t scan the photo. Try again or add the food manually.');button.textContent=t("Reintentar análisis →","Retry scan →");}}finally{clearTimeout(timeout);if(analysisController===controller)analysisController=null;if(session===photoSession){analyzing=false;controls();}}};
 ready=Boolean(window.KeeprDetector?.supported());status.textContent=ready?'':t("No podemos analizar fotos en este navegador. Prueba con Safari o Chrome actualizado, o agrega tus alimentos manualmente.","Photo scanning is unavailable in this browser. Try an updated version of Safari or Chrome, or add food manually.");status.hidden=ready;controls();
}
function scanFoodKey(name){return foodNormalize(canonicalFoodName(name));}
function mergeScannedFood(items,incoming){
 const key=scanFoodKey(incoming.name);
 const index=items.findIndex(item=>scanFoodKey(item.name)===key);
 if(index<0){items.push(incoming);return incoming.id;}
 const existing=items[index];
 const useQuantity=incoming.quantitySource==='manual'||(incoming.quantitySource==='detected'&&(
  existing.quantity==='Por confirmar'||(existing.quantitySource==='detected'&&parseInt(incoming.quantity,10)>parseInt(existing.quantity,10))
 ));
 const useDate=incoming.date&&incoming.dateKind!=='estimated'&&
  (!existing.date||existing.dateKind==='estimated'||incoming.date<existing.date);
 items[index]={...existing,
  ...(useQuantity?{quantity:incoming.quantity,quantitySource:incoming.quantitySource}:{}),
  ...(useDate?{date:incoming.date,dateKind:incoming.dateKind,dateEstimateNote:null}:{})
 };
 return existing.id;
}
function reviewDetected(result){
 const count=result.items.length;
 openModal(t("REVISAR RESULTADOS","REVIEW RESULTS"),`<h2>${count?t("Confirma tus alimentos","Confirm your food"):t("No se identificaron alimentos","No food detected")}</h2><p>${count?t("Desmarca lo que no quieras guardar. Abre un alimento para confirmar su cantidad total. El recuento de la foto es aproximado.","Uncheck anything you don’t want to save. Open an item to confirm its total quantity. The photo count is approximate."):t("Prueba con una foto más cercana o agrega un alimento a mano.","Try a closer photo or add an item manually.")}</p><form id="review-form"><div id="detected-list" class="quick-review"></div><button type="button" class="text-button" id="add-detected">${t("+ Agregar alimento faltante","+ Add missing item")}</button><p id="review-error" role="alert"></p><div class="modal-actions"><button type="button" class="secondary" id="other-photos">${t("Otra foto","Choose another photo")}</button><button class="primary" type="submit">${t("Guardar alimentos","Save food")}</button></div></form>`);
 const rows=[];
 function addRow(item){
  const row=document.createElement('section');row.className='quick-review-row';
  const index=rows.length;
  const displayedName=foodLabel(item.name);
  row.innerHTML=`<label class="quick-check"><input type="checkbox" class="detected-include" checked aria-label="${t("Incluir ","Include ")}${escapeHTML(displayedName||t("alimento nuevo","new item"))}"></label><details ${item.name?'':'open'}><summary><span class="quick-name">${escapeHTML(displayedName||t("Alimento nuevo","New item"))}</span></summary><div class="quick-fields"><label>${t("Nombre","Name")}<input class="detected-name" maxlength="100" value="${escapeHTML(displayedName)}"></label><div class="form-row"><label>${t("Cantidad (opcional)","Quantity (optional)")}<input class="detected-quantity" maxlength="100" value="${escapeHTML(item.quantity?quantityLabel(item.quantity):'')}"></label><label>${t("Fecha de vencimiento (opcional)","Expiration date (optional)")}<input type="date" class="detected-date" value="${escapeHTML(item.dateKind==='estimated'?'':item.date||'')}"></label></div></div></details>`;
  row.dataset.index=index;
  const name=row.querySelector('.detected-name');
  name.oninput=()=>{const title=name.value.trim()||t("Alimento nuevo","New item");row.querySelector('.quick-name').textContent=title;row.querySelector('.detected-include').setAttribute('aria-label',t("Incluir ","Include ")+title);};
  $('#detected-list').append(row);
  rows.push({row,item,displayedName});
  return name;
 }
 result.items.forEach(addRow);
 $('#add-detected').onclick=()=>addRow({name:'',quantity:null}).focus();
 $('#other-photos').onclick=photoFlow;
 $('#review-form').onsubmit=e=>{
  e.preventDefault();
  const selected=rows.filter(({row})=>row.querySelector('.detected-include').checked);
  if(!selected.length){$('#review-error').textContent=t("Selecciona al menos un alimento.","Select at least one item.");return;}
  const draft=[...state.items];
  const savedIds=new Set();
  const usedIds=new Set(state.items.map(i=>i.id));
  let id=newId();
  for(const {row,item,displayedName} of selected){
   const enteredName=row.querySelector('.detected-name').value.trim();
   const name=enteredName===displayedName?item.name:enteredName;
   const enteredQuantity=row.querySelector('.detected-quantity').value.trim();
   const quantity=item.quantity&&enteredQuantity===quantityLabel(item.quantity)?item.quantity:enteredQuantity;
   const labelDate=row.querySelector('.detected-date').value;
   if(!name){$('#review-error').textContent=t("Escribe el nombre del alimento seleccionado.","Enter a name for the selected item.");row.querySelector('details').open=true;row.querySelector('.detected-name').focus();return;}
   const review=labelDate?null:suggestedReview(name);
   while(usedIds.has(id))id++;
   const savedId=mergeScannedFood(draft,{id:id++,name,quantity:quantity||'Por confirmar',date:labelDate||review,dateKind:labelDate?(labelDate===item.date&&item.dateKind!=='estimated'?item.dateKind:'reference'):review?'estimated':'unknown',quantitySource:quantity&&quantity===item.quantity?item.quantitySource:quantity?'manual':'unknown',emoji:resolveFood(name)?.emoji||'🍽️'});
   savedIds.add(savedId);
  }
  state.items=draft;save();
  filter='all';query='';location.hash='inventario';render();
  openModal(t("LISTO","DONE"),`<h2>${savedIds.size===1?t("Alimento guardado","Food saved"):savedIds.size+t(" alimentos guardados"," items saved")}</h2><p>${t("Ya puedes buscar preparaciones con lo que tienes.","You can now find recipes using what you have.")}</p><div class="modal-actions"><button class="secondary" id="finish-review">${t("Ver inventario","View inventory")}</button><button class="primary" data-find-ideas>${t("Buscar ideas","Find ideas")}</button></div>`);
  $('#finish-review').onclick=closeModal;
 };
}
function showRecipe(id){const r=recipes.find(r=>r.id===id)||Kitchen.cookbook(language).find(r=>r.id===id);if(!r)return;const m=matches(r),ready=m.length===r.needs.length;openModal(r.local?'KEEPR COOKBOOK':t('COCINA CON LO QUE TIENES','COOK WITH WHAT YOU HAVE'),`<h2>${escapeHTML(r.name)}</h2><p>${r.time} ${t('minutos','minutes')}</p><h3>${t('Ingredientes','Ingredients')}</h3><div class="ingredients">${r.needs.map((n,index)=>`<span class="${m.some(i=>scanFoodKey(i.name)===scanFoodKey(n))?'':'missing'}">${m.some(i=>scanFoodKey(i.name)===scanFoodKey(n))?'✓':t('Falta:','Missing:')} ${escapeHTML(foodLabel(n))}${r.amounts?' · '+escapeHTML(r.amounts[index]):''}</span>`).join('')}</div><p>${escapeHTML(r.pantry)}</p><h3>${t('Preparación','Preparation')}</h3><ol class="steps">${r.steps.map(s=>`<li>${escapeHTML(s)}</li>`).join('')}</ol><p class="notice">${t('Al terminar, podrás indicar cuánto usaste y conservar lo que quede en tu inventario.','After cooking, you can log how much you used and keep what remains in your inventory.')}</p><div class="modal-actions"><button class="secondary" id="back-recipe">${t('Volver','Back')}</button><button class="primary" id="cook" ${ready?'':'disabled'}>${t('Registrar preparación','Log cooking')}</button></div>`);$('#back-recipe').onclick=closeModal;$('#cook').onclick=()=>{
 const ingredients=matches(r);if(ingredients.length!==r.needs.length){toast(t('El inventario cambió. Revisa los ingredientes.','Your inventory changed. Check the ingredients.'));return;}
 openModal(t('ACTUALIZAR INVENTARIO','UPDATE INVENTORY'),`<h2>${t('¿Cuánto quedó?','How much is left?')}</h2><p>${t('Conserva las cantidades que todavía tienes. Marca solo lo que terminaste.','Keep the amounts you still have. Mark only what you finished.')}</p><form id="cook-form">${ingredients.map(i=>`<section class="consumption-row" data-id="${i.id}"><strong>${escapeHTML(foodLabel(i.name))}</strong><small>${t('Antes:','Before:')} ${escapeHTML(quantityLabel(i.quantity))}</small><label>${t('Cantidad restante','Remaining amount')}<input class="remaining" value="${escapeHTML(quantityLabel(i.quantity))}" maxlength="100" required></label><label class="checkbox-label"><input class="finished" type="checkbox"> Se terminó por completo</label></section>`).join('')}<p id="cook-error" role="alert"></p><div class="modal-actions"><button type="button" class="secondary" id="cancel-cook">${t('Cancelar','Cancel')}</button><button type="submit" class="primary">${t('Guardar consumo','Save usage')}</button></div></form>`);
 document.querySelectorAll('.consumption-row').forEach(row=>row.querySelector('.finished').onchange=e=>{row.querySelector('.remaining').disabled=e.target.checked;});
 $('#cancel-cook').onclick=closeModal;$('#cook-form').onsubmit=e=>{e.preventDefault();try{const updates=[...document.querySelectorAll('.consumption-row')].map(row=>({id:Number(row.dataset.id),finished:row.querySelector('.finished').checked,remaining:row.querySelector('.remaining').value}));const next=Kitchen.consume(state.items,updates);state.items=next.items;state.consumed+=next.consumed;save();closeModal();render();toast(t('Cantidades actualizadas. ¡Buen provecho!','Amounts updated. Enjoy your meal!'));}catch(err){$('#cook-error').textContent=t(err.message,'Enter the amount left or mark the item as used up.');}};
 };}
function removeItem(id,consumed=false){const i=state.items.find(i=>i.id===id);if(!i)return;openModal(consumed?t('MARCAR COMO CONSUMIDO','MARK AS CONSUMED'):t('ELIMINAR REGISTRO','DELETE ITEM'),`<h2>${consumed?t('¿Ya lo aprovechaste?','Did you use it up?'):t('¿Retirar este alimento?','Remove this item?')}</h2><p>${t('Se quitará el registro completo:','This entire entry will be removed:')} <strong>${escapeHTML(foodLabel(i.name))} · ${escapeHTML(quantityLabel(i.quantity))}</strong>.</p>${consumed?`<p class="subtle">${t('Si te queda una parte, cancela y edita la cantidad.','If you have some left, cancel and edit the quantity.')}</p>`:''}<div class="modal-actions"><button class="secondary" id="cancel-remove">${t('Cancelar','Cancel')}</button><button class="primary" id="confirm-remove">${consumed?t('Sí, lo consumí','Yes, I used it up'):t('Eliminar','Delete')}</button></div>`);$('#cancel-remove').onclick=closeModal;$('#confirm-remove').onclick=()=>{state.items=state.items.filter(x=>x.id!==id);if(consumed)state.consumed++;save();closeModal();render();toast(consumed?t('Consumo registrado.','Usage saved.'):t('Alimento eliminado.','Food deleted.'));};}
$('#about').onclick=()=>openModal(t('TU ESPACIO EN KEEPR','YOUR SPACE IN KEEPR'),`<h2>${t('Una cocina mejor organizada.','A more organized kitchen.')}</h2><p>${t('Tu inventario se guarda en este navegador. Fotografía tus compras, revisa los alimentos encontrados y descubre qué cocinar.','Your inventory is saved in this browser. Take photos of your groceries, review the foods found and discover what to cook.')}</p><p>${t('Las fechas sugeridas son recordatorios de revisión. Puedes explorar el recetario cuando quieras.','Suggested dates are reminders to check your food. You can browse the cookbook anytime.')}</p><p class="subtle">AstroWind · MIT · onWidget. ${t('Fotografía','Photography')}: Unsplash.</p>`);
$('#close-modal').onclick=closeModal;
$('#modal').addEventListener('close',()=>{photoSession++;if(analysisController){analysisController.abort();analysisController=null;}window.KeeprDetector?.release();if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-add'))addOptions();if(b.hasAttribute('data-manual'))editItem();if(b.dataset.detail)showFood(Number(b.dataset.detail));if(b.hasAttribute('data-find-ideas')){if($('#modal').open)closeModal();location.hash='recetas';render();refreshRecipes(true);}if(b.hasAttribute('data-scan'))photoFlow();if(b.dataset.go)location.hash=b.dataset.go;if(b.dataset.edit)editItem(Number(b.dataset.edit));if(b.dataset.consume)removeItem(Number(b.dataset.consume),true);if(b.dataset.remove)removeItem(Number(b.dataset.remove));if(b.dataset.recipe)showRecipe(Number(b.dataset.recipe));});
$('#language-toggle').onclick=()=>{
 clearTimeout(recipeTimer);
 recipeController?.abort();recipeController=null;recipesLoading=false;recipeSignature='';generatedSignature='';recipeError='';recipeNotes='';
 language=language==='es'?'en':'es';
 try{localStorage.setItem('keepr-language',language);}catch{}
 updateLanguage();
 render();
};
updateLanguage();
window.addEventListener('hashchange',()=>{
 render();
 window.scrollTo(0,0);
});
window.addEventListener('storage',e=>{if(e.key==='keepr-v1')location.reload();});
render();
warmHeaderPhotos();
