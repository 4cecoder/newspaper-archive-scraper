(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,72215,e=>{"use strict";var t=e.i(43476),a=e.i(71645);let o=`
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`,r=`
precision mediump float;

uniform vec2 u_res;
uniform float u_time;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy * 2.0 - u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.09;
  float time = u_time;

  // Cinematic envelope: two slow, phase-shifted waves so the smoke and the
  // stars trade places over time — quiet moments, then a swell.
  float breath = 0.5 + 0.5 * sin(time * 0.22);
  float breath2 = 0.5 + 0.5 * sin(time * 0.13 + 2.1);
  float envSmoke = clamp(breath * (0.35 + 0.65 * breath2), 0.0, 1.0);
  float envStars = clamp(breath2 * (0.35 + 0.65 * breath), 0.0, 1.0);

  // Aurora smoke: drifting ribbons that condense and dissolve in patches.
  float e1 = fbm(p * 1.35 + vec2(t * 0.9, -t * 0.55));
  float e2 = fbm(p * 2.1 - vec2(t * 0.6, t * 0.9) + 5.2);
  float m = e1 * 0.6 + e2 * 0.4;
  float sheet = sin(m * 6.283 + p.y * 1.4 + t * 1.5);
  float patch = fbm(p * 0.9 + vec2(time * 0.05, -time * 0.035) + 3.7);
  float life = smoothstep(0.32, 0.7, patch);
  float band =
    smoothstep(0.42, 0.86, sheet * 0.5 + 0.5) * (0.3 + 0.7 * m) *
    (0.25 + 0.75 * life);

  vec3 gold = vec3(0.85, 0.71, 0.29);
  vec3 cream = vec3(0.97, 0.94, 0.86);
  vec3 col = mix(gold, cream, band * 0.5) * band * (0.14 + 0.16 * envSmoke);

  // Stars: paper dust with a birth-to-death cycle — it rises, blooms, holds,
  // then fades out, so the field is constantly replenishing itself.
  float cell = 20.0;
  vec2 id = floor(gl_FragCoord.xy / cell);
  float seed = hash21(id);
  float isGold = step(0.965, seed);
  float isCream = step(0.993, seed);
  float lifeSpan = mix(5.0, 9.0, hash21(id + 1.7));
  float age = mod(time * (0.9 + seed) + seed * lifeSpan, lifeSpan);
  float bloom = smoothstep(0.0, 0.18, age) * smoothstep(lifeSpan, lifeSpan - 0.18, age);
  vec2 starPos = (id + vec2(0.5)) * cell
    + vec2(hash21(id + 7.1), hash21(id + 3.7)) * cell * 0.5;
  starPos.y += mod(time * 5.0 + seed * 40.0, 140.0);
  float twinkle = 0.6 + 0.4 * sin(time * (1.5 + seed * 2.0) + seed * 40.0);
  float dist = length(gl_FragCoord.xy - starPos);
  float star = smoothstep(2.2, 0.3, dist) * bloom * twinkle;
  col += gold * star * isGold * (0.55 + 0.45 * envStars);
  col += cream * star * isCream * 0.7 * (0.55 + 0.45 * envStars);

  // Soft warm key-light pooling from the top centre.
  vec2 keyQ = uv - vec2(0.5, 0.15);
  float key = smoothstep(0.9, 0.05, length(keyQ * vec2(1.05, 0.75)));
  col += cream * key * 0.05 * (0.3 + 0.7 * envSmoke);

  // Gentle vignette to hold the composition together.
  float vig = smoothstep(0.75, 1.15, length(uv - 0.5) * 1.35);
  col = max(col - vig * 0.05, vec3(0.0));

  float alpha = clamp((col.r + col.g + col.b) * 1.7, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;e.s(["WebGLBackdrop",0,function(){let e=(0,a.useRef)(null);return(0,a.useEffect)(()=>{let t=e.current;if(!t)return;let a=t.getContext("webgl")??t.getContext("experimental-webgl");if(!a)return;let l=window.matchMedia("(prefers-reduced-motion: reduce)").matches,i=(e,t)=>{let o=a.createShader(e);return o?(a.shaderSource(o,t),a.compileShader(o),a.getShaderParameter(o,a.COMPILE_STATUS))?o:(console.warn("WebGL shader compile failed:",a.getShaderInfoLog(o)),a.deleteShader(o),null):null},n=i(a.VERTEX_SHADER,o),s=i(a.FRAGMENT_SHADER,r);if(!n||!s)return;let c=a.createProgram();if(!c)return;if(a.attachShader(c,n),a.attachShader(c,s),a.linkProgram(c),!a.getProgramParameter(c,a.LINK_STATUS))return void console.warn("WebGL program link failed:",a.getProgramInfoLog(c));a.useProgram(c);let m=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,m),a.bufferData(a.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),a.STATIC_DRAW);let f=a.getAttribLocation(c,"a_pos");a.enableVertexAttribArray(f),a.vertexAttribPointer(f,2,a.FLOAT,!1,0,0);let d=a.getUniformLocation(c,"u_time"),h=a.getUniformLocation(c,"u_res");a.enable(a.BLEND),a.blendFunc(a.SRC_ALPHA,a.ONE_MINUS_SRC_ALPHA),a.clearColor(0,0,0,0);let p=0,u=0,v=0,g=!1,b=!0,S=()=>{let e=t.parentElement;if(!e)return;let o=Math.min(window.devicePixelRatio||1,2),r=Math.max(1,Math.round(e.clientWidth*o)),l=Math.max(1,Math.round(e.clientHeight*o));(r!==p||l!==u)&&(p=r,u=l,t.width=p,t.height=u,a.viewport(0,0,p,u))},_=performance.now(),A=e=>{a.uniform1f(d,l?8:(e-_)/1e3),a.uniform2f(h,p,u),a.clear(a.COLOR_BUFFER_BIT),a.drawArrays(a.TRIANGLES,0,3),v=requestAnimationFrame(A)},w=()=>{g||(g=!0,v=requestAnimationFrame(A))},x=()=>{g&&(g=!1,cancelAnimationFrame(v))},y=new ResizeObserver(()=>S());t.parentElement&&y.observe(t.parentElement),S();let R=new IntersectionObserver(([e])=>{(b=e.isIntersecting)?w():x()},{threshold:0});R.observe(t);let P=()=>{document.hidden?x():b&&w()};return document.addEventListener("visibilitychange",P),w(),()=>{x(),y.disconnect(),R.disconnect(),document.removeEventListener("visibilitychange",P),a.deleteProgram(c),n&&a.deleteShader(n),s&&a.deleteShader(s),a.deleteBuffer(m)}},[]),(0,t.jsx)("canvas",{ref:e,"aria-hidden":"true",className:"pointer-events-none absolute inset-0 z-0 h-full w-full"})}])}]);