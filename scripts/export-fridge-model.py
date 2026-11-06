"""Export a trusted YOLO checkpoint with safe, allowlisted unpickling. Requires torch, ultralytics, onnx. Usage: python3 scripts/export-fridge-model.py path/to/best.pt"""
import torch,importlib
from ultralytics import YOLO
import sys
p=sys.argv[1] if len(sys.argv)>1 else 'best.pt'
# Safe unpickling: allow only known tensor/NN container classes from installed packages.
allowed=set(['torch.nn.modules.activation.SiLU','torch.nn.modules.batchnorm.BatchNorm2d','torch.nn.modules.container.ModuleList','torch.nn.modules.container.Sequential','torch.nn.modules.conv.Conv2d','torch.nn.modules.linear.Identity','torch.nn.modules.pooling.MaxPool2d','torch.nn.modules.upsampling.Upsample','ultralytics.nn.modules.block.Bottleneck','ultralytics.nn.modules.block.C2f','ultralytics.nn.modules.block.DFL','ultralytics.nn.modules.block.SPPF','ultralytics.nn.modules.conv.Concat','ultralytics.nn.modules.conv.Conv','ultralytics.nn.modules.head.Detect','ultralytics.nn.tasks.DetectionModel'])
unsafe=torch.serialization.get_unsafe_globals_in_checkpoint(p)
unknown=set(unsafe)-allowed
if unknown:raise ValueError(unknown)
for name in unsafe:
 module,attr=name.rsplit('.',1);torch.serialization.add_safe_globals([getattr(importlib.import_module(module),attr)])
c=torch.load(p,map_location='cpu',weights_only=True)
m=c.get('ema') or c['model'];print('Etiquetas:',len(m.names),'Parámetros:',sum(x.numel() for x in m.parameters()),flush=True)
y=YOLO('yolov8n.yaml');y.model=m.float().eval();y.model.pt_path=p;y.model.task='detect';y.task='detect';y.export(format='onnx',imgsz=640,opset=17,simplify=False,dynamic=False,half=False)
