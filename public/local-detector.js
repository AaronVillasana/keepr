(function(){
 let worker=null,busy=false;
 function supported(){return typeof Worker!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof createImageBitmap==='function';}
 function analyze(images,{signal,onProgress=()=>{}}={}){
  if(!supported())return Promise.reject(new Error('Tu navegador no admite el detector local. Prueba con una versión reciente de Safari o Chrome, o agrega alimentos manualmente.'));
  if(busy)return Promise.reject(new Error('Ya hay un análisis en curso.'));
  if(signal?.aborted)return Promise.reject(new DOMException('Cancelado','AbortError'));
  busy=true;
  return new Promise((resolve,reject)=>{
   let settled=false;
   const cleanup=()=>{busy=false;signal?.removeEventListener('abort',abort);if(worker){worker.onmessage=null;worker.onerror=null;}};
   const finish=(error,result)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve(result);};
   const abort=()=>{worker?.terminate();worker=null;finish(new DOMException('Cancelado','AbortError'));};
   try{
    worker??=new Worker('/local-detector.worker.js');
    worker.onmessage=({data})=>{if(data.progress)onProgress(data.progress);else if(data.error){worker.terminate();worker=null;finish(new Error(data.error));}else if(data.result)finish(null,data.result);};
    worker.onerror=()=>{worker?.terminate();worker=null;finish(new Error('No se pudo cargar el detector. Revisa tu conexión y vuelve a intentarlo.'))};
    signal?.addEventListener('abort',abort,{once:true});worker.postMessage({images});
   }catch(e){worker?.terminate();worker=null;finish(e);}
  });
 }
 function release(){if(busy)return;worker?.terminate();worker=null;}
 window.KeeprDetector={analyze,supported,release};
})();
