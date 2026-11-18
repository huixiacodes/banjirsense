// @shadergradient/react was written against an older three.js and #includes a few
// shader chunks that newer three removed or renamed. Register them so its shaders compile.
// We only use lightType="3d" (no env map / transmission), so the removed chunks can be empty.
import { ShaderChunk } from 'three'

const shims = {
  encodings_fragment: ShaderChunk.colorspace_fragment,
  uv2_pars_fragment: '',
  uv2_pars_vertex: '',
  uv2_vertex: '',
  cube_uv_reflection_fragment: '',
  transmissionmap_pars_fragment: '',
  transmissionmap_fragment: '',
}

for (const [k, v] of Object.entries(shims)) if (!(k in ShaderChunk)) ShaderChunk[k] = v
