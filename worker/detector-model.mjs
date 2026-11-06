export const modelFile={key:'detectors/ingredients-yolov8x-v2.onnx.gz',path:'/assets/detector/ingredients-yolov8x-v2.onnx',size:59784293,rawSize:68716526,sha256:'20cdaa297c18b7c60dd6e9ef7d50c27c296fe7df6282ffacdd46d067701b64b1'};
export async function detectorModelRoute(request,env){
 const url=new URL(request.url),bucket=env.BUCKET;
 if(url.pathname===modelFile.path&&['GET','HEAD'].includes(request.method)){
  if(!bucket)return Response.json({error:'El detector ampliado aún no está instalado.'},{status:503});
  const object=request.method==='HEAD'?await bucket.head(modelFile.key):await bucket.get(modelFile.key);
  if(!object)return Response.json({error:'El detector ampliado aún no está instalado.'},{status:503});
  return new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':'application/octet-stream','Content-Encoding':'gzip','Content-Length':String(modelFile.size),'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','ETag':object.httpEtag}});
 }
 if(url.pathname==='/api/install-detector'){
  // The Site's owner-only gate protects this route; fixed key, size and checksum
  // prevent arbitrary files, paths or executable uploads.
  if(request.method!=='PUT')return new Response(null,{status:405});
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return new Response(null,{status:403});
  if(!bucket)return Response.json({error:'Falta almacenamiento del detector.'},{status:503});
  if(request.headers.get('Content-Type')!=='application/octet-stream'||Number(request.headers.get('Content-Length'))!==modelFile.size)return Response.json({error:'Archivo de modelo incompatible.'},{status:400});
  if(await bucket.head(modelFile.key))return Response.json({installed:true,unchanged:true});
  try{await bucket.put(modelFile.key,request.body,{sha256:modelFile.sha256,httpMetadata:{contentType:'application/octet-stream',contentEncoding:'gzip'},customMetadata:{sha256:modelFile.sha256},onlyIf:{etagDoesNotMatch:'*'}});return Response.json({installed:true});}catch{return Response.json({error:'No se pudo verificar e instalar el modelo.'},{status:400});}
 }
 return null;
}
