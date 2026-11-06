/* All inference and image processing remain in this worker on the device. */
importScripts('/assets/detector/ort.wasm.min.js','/detector-core.js');
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
ort.env.wasm.wasmPaths=new URL('/assets/detector/',self.location.href).href;
ort.env.logLevel='error';
let session;
const modelURL='/assets/detector/ingredients-yolov8x-v2.onnx';
async function modelBytes(){
 let cache;try{cache=await caches.open('keepr-detectors-v2');const saved=await cache.match(modelURL);if(saved){const bytes=new Uint8Array(await saved.arrayBuffer());if(bytes.length===68716526){self.postMessage({progress:'Cargando el detector guardado en este dispositivo…'});return bytes;}await cache.delete(modelURL);}}catch{}
 self.postMessage({progress:'Descargando detector ampliado (~60 MB). Solo se descarga la primera vez si hay espacio disponible…'});
 const response=await fetch(modelURL);if(!response.ok)throw new Error('El detector ampliado no está disponible. Revisa tu conexión y vuelve a intentarlo.');
 const reader=response.body.getReader(),chunks=[];let total=0,last=0;
 while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);total+=value.length;if(total-last>1024*1024){last=total;self.postMessage({progress:`Descargando detector: ${Math.min(99,Math.round(total/68716526*100))}%… Las fotos permanecen en tu dispositivo.`});}}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 if(total!==68716526)throw new Error('La descarga del detector quedó incompleta. Intenta nuevamente.');
 try{if(cache)await cache.put(modelURL,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));}catch{}
 return bytes;
}

async function inputTensor(src){
 const blob=await (await fetch(src)).blob();const image=await createImageBitmap(blob);
 try{const side=640,scale=Math.min(side/image.width,side/image.height),w=Math.round(image.width*scale),h=Math.round(image.height*scale);const canvas=new OffscreenCanvas(side,side),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,side,side);ctx.drawImage(image,Math.floor((side-w)/2),Math.floor((side-h)/2),w,h);const pixels=ctx.getImageData(0,0,side,side).data,n=side*side,data=new Float32Array(n*3);for(let i=0;i<n;i++){data[i]=pixels[4*i]/255;data[n+i]=pixels[4*i+1]/255;data[2*n+i]=pixels[4*i+2]/255;}return new ort.Tensor('float32',data,[1,3,side,side]);}finally{image.close();}
}
self.onmessage=async({data})=>{
 try{
  if(!Array.isArray(data.images)||!data.images.length||data.images.length>3||data.images.some(s=>typeof s!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(s)))throw new Error('Selecciona entre una y tres fotos válidas.');
  if(!session){self.postMessage({progress:'Preparando el detector en este dispositivo. La primera carga tarda un poco…'});const bytes=await modelBytes();self.postMessage({progress:'Preparando el detector. En celulares puede tardar un poco…'});session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});}
  const detections=[];
  for(let i=0;i<data.images.length;i++){
   self.postMessage({progress:`Analizando foto ${i+1} de ${data.images.length} en tu dispositivo…`});
   const input=await inputTensor(data.images[i]);let output;
   try{output=await session.run({images:input});const tensor=output[session.outputNames[0]];detections.push(KeeprDetection.decode(tensor.data,tensor.dims));}finally{input.dispose();if(output)Object.values(output).forEach(t=>t.dispose());}
  }
  self.postMessage({result:KeeprDetection.summarize(detections)});
 }catch(e){self.postMessage({error:'No se pudo ejecutar el detector local. Prueba con una foto más cercana o agrega los alimentos manualmente.'});}
};
