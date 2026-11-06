"""Prepare YOLO11n weights for browser use; run with onnx + numpy installed.
Input: ONNX export at /path/model.onnx. Output is weights-only int8 Q/DQ;
activations remain float32. No training images or calibration data are used.
"""
import sys
from pathlib import Path
import numpy as np
import onnx
from onnx import numpy_helper, helper
source=Path(sys.argv[1]); target=Path(sys.argv[2])
m=onnx.load(source)
if next(o.version for o in m.opset_import if not o.domain)<13:m=onnx.version_converter.convert_version(m,13)
new=[]; initializers=[]
for t in m.graph.initializer:
 a=numpy_helper.to_array(t)
 if a.dtype==np.float32 and a.ndim>=2 and a.size>=256:
  # Per-output-channel symmetric weights; restore via standard ONNX DQ.
  scale=np.maximum(np.max(np.abs(a),axis=tuple(range(1,a.ndim)))/127,1e-8).astype(np.float32)
  q=np.clip(np.round(a/scale.reshape((-1,)+(1,)*(a.ndim-1))),-127,127).astype(np.int8)
  initializers.extend([numpy_helper.from_array(q,t.name+'_int8'),numpy_helper.from_array(scale,t.name+'_scale'),numpy_helper.from_array(np.zeros_like(scale,dtype=np.int8),t.name+'_zero')])
  new.append(helper.make_node('DequantizeLinear',[t.name+'_int8',t.name+'_scale',t.name+'_zero'],[t.name],axis=0))
 else:initializers.append(t)
nodes=list(m.graph.node);del m.graph.node[:];m.graph.node.extend(new+nodes)
del m.graph.initializer[:];m.graph.initializer.extend(initializers)
onnx.checker.check_model(m);onnx.save(m,target)
print('Prepared',target.name,target.stat().st_size,'bytes')
