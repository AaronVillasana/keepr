(function(root){
 'use strict';
 const names=["Manzana", "Espárrago", "Aguacate", "Plátano", "Frijol", "Carne de res", "Arándano", "Pan", "Brócoli", "Mantequilla", "Col", "Zanahoria", "Coliflor", "Queso", "Pechuga de pollo", "Pollo", "Chile", "Chocolate", "Elote", "Pepino", "Huevo", "Berenjena", "Pescado", "Harina", "Ajo", "Jengibre", "Uva", "Jamón", "Kiwi", "Poro", "Limón amarillo", "Lechuga", "Limón", "Mango", "Leche", "Champiñón", "Cebolla", "Naranja", "Chícharo", "Durazno", "Pera", "Pimiento", "Piña", "Papa", "Rábano", "Salchicha", "Espinaca", "Fresa", "Camote", "Jitomate", "Sandía", "Yogur", "Calabacita", "Pimiento", "Hojas verdes", "Carne de cerdo", "Calabaza", "Arroz", "Tofu", "Carne", "Cebolla", "Mango", "Papa", "Pollo", "Jitomate", "Hojas verdes", "Anchoa", "Chirimoya", "Alcachofa", "Betabel", "Pimiento", "Cereza", "Garbanzo", "Cilantro", "Arándano rojo", "Grosella", "Chile verde", "Guayaba", "Kumquat", "Pimienta larga", "Carne molida", "Mora", "Carne de cordero", "Okra", "Papaya", "Perejil", "Pitahaya", "Frambuesa", "Camarón", "Frijol blanco", "Champiñón"];
 const coverage=[...new Set(names)].sort((a,b)=>a.localeCompare(b,"es"));
 const iou=(a,b)=>{const area=Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));const union=(a.x2-a.x1)*(a.y2-a.y1)+(b.x2-b.x1)*(b.y2-b.y1)-area;return union>0?area/union:0;};
 function decode(data,dims,{threshold=.6,maxBoxes=100}={}){
  if(dims.length!==3||dims[0]!==1||dims[1]!==names.length+4||data.length!==dims[1]*dims[2])throw new Error('El modelo devolvió un formato incompatible.');
  const count=dims[2],boxes=[];
  for(let i=0;i<count;i++){
   let score=0,cls=-1;for(let c=0;c<names.length;c++){const s=data[(c+4)*count+i];if(s>score){score=s;cls=c;}}
   if(score<threshold||!Number.isFinite(score))continue;
   const x=data[i],y=data[count+i],w=data[2*count+i],h=data[3*count+i];
   if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)continue;
   boxes.push({cls,score,x1:x-w/2,y1:y-h/2,x2:x+w/2,y2:y+h/2});
  }
  boxes.sort((a,b)=>b.score-a.score);const keep=[];
  for(const b of boxes){if(!keep.some(k=>iou(b,k)>.45)){keep.push(b);if(keep.length>=maxBoxes)break;}}
  return keep;
 }
 function summarize(photoDetections){
  const groups=new Map();
  photoDetections.forEach((boxes,photo)=>{
   for(const b of boxes){if(!Number.isInteger(b.cls)||!names[b.cls])continue;const name=names[b.cls],old=groups.get(name);if(!old||b.score>old.score)groups.set(name,{score:b.score,photo});}
  });
  return {items:[...groups].sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([name,g])=>({name,quantity:null,quantitySource:'unknown',date:null,dateText:null,dateKind:'unknown',certainty:'uncertain',evidence:`Sugerencia visual en foto ${g.photo+1} · puntuación del detector ${Math.round(g.score*100)}%. Confirma la identidad y la cantidad.`,detectorScore:g.score})),notes:['Detector de ingredientes de refrigerador con 91 etiquetas de entrenamiento, agrupadas en 82 nombres. Puede omitir o confundir alimentos.','No identifica el contenido de envases opacos. Cantidades, fechas y estado del alimento quedan pendientes de tu revisión.',...(photoDetections.length>1?['Las sugerencias repetidas entre fotos se agrupan; no se suman cantidades para evitar contar el mismo alimento dos veces.']:[])]};
 }
 root.KeeprDetection={names,coverage,decode,summarize,iou};
 if(typeof module!=='undefined')module.exports=root.KeeprDetection;
})(globalThis);
