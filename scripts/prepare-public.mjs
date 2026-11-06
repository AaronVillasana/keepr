import {copyFileSync,mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
mkdirSync('public',{recursive:true});
for(const file of ['app.js','styles.css','food-catalog.js','kitchen.js','detector-core.js','local-detector.js','local-detector.worker.js'])copyFileSync(file,'public/'+file);

const archive='models/ingredients-yolov8x-v2.onnx.gz';
if(!existsSync(archive)){writeFileSync(archive,Buffer.concat([1,2,3].map(i=>readFileSync(archive+'.part'+String(i).padStart(2,'0')))));}
const model='public/assets/detector/ingredients-yolov8x-v2.onnx';
if(!existsSync(model)){mkdirSync('public/assets/detector',{recursive:true});writeFileSync(model,gunzipSync(readFileSync('models/ingredients-yolov8x-v2.onnx.gz')));}
