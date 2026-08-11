"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative WebGL backdrop for the hero: slow-drifting aurora sheets in the
 * theme's gold/cream over midnight ink, plus a sparse field of gold "paper
 * dust". Pure WebGL (no dependencies), one fullscreen shader pass.
 *
 * Pauses when the canvas scrolls off-screen or the tab is hidden, respects
 * `prefers-reduced-motion` (renders a single static frame), and renders
 * nothing at all if WebGL isn't available.
 */

const VERTEX_SHADER = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
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
`;

export function WebGLBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context =
      canvas.getContext("webgl") ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!context) return;
    const gl = context as WebGLRenderingContext;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("WebGL shader compile failed:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("WebGL program link failed:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const positionLoc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_res");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let width = 0;
    let height = 0;
    let rafId = 0;
    let running = false;
    let visible = true;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.round(parent.clientWidth * dpr));
      const nextHeight = Math.max(1, Math.round(parent.clientHeight * dpr));
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const startedAt = performance.now();
    const render = (now: number) => {
      const time = reduced ? 8 : (now - startedAt) / 1000;
      gl.uniform1f(timeLoc, time);
      gl.uniform2f(resLoc, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      render(now);
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    };

    const resizeObserver = new ResizeObserver(() => resize());
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    resize();

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}
