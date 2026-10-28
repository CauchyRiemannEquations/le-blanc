import {describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {MOBILE_PORTRAIT_QUERY,requestLandscape} from '../src/orientation';
import OrientationGate from '../src/components/OrientationGate';

const enabled=()=>({mobile:true,fullscreen:()=>false,requestFullscreen:vi.fn(async()=>{}),lock:vi.fn(async()=>{})});
describe('explicit mobile landscape request',()=>{
 it('requests fullscreen once before locking landscape',async()=>{
  const order:string[]=[],host=enabled();
  host.requestFullscreen.mockImplementation(async()=>{order.push('fullscreen');});
  host.lock.mockImplementation(async()=>{order.push('lock');});
  expect(await requestLandscape(host)).toBe(true);
  expect(order).toEqual(['fullscreen','lock']);expect(host.requestFullscreen).toHaveBeenCalledOnce();
 });
 it('does nothing on a fine-pointer desktop, or without orientation locking',async()=>{
  const host=enabled();expect(await requestLandscape({...host,mobile:false})).toBe(false);
  expect(await requestLandscape({...host,lock:undefined})).toBe(false);
  expect(host.requestFullscreen).not.toHaveBeenCalled();expect(host.lock).not.toHaveBeenCalled();
 });
 it('does not request fullscreen again when already fullscreen',async()=>{
  const host=enabled();expect(await requestLandscape({...host,fullscreen:()=>true})).toBe(true);
  expect(host.requestFullscreen).not.toHaveBeenCalled();expect(host.lock).toHaveBeenCalledOnce();
 });
 it('contains fullscreen/lock rejection; standalone locking may still succeed',async()=>{
  const host=enabled();host.requestFullscreen.mockRejectedValue(new Error('NotAllowedError'));
  expect(await requestLandscape(host)).toBe(true);
  host.lock.mockRejectedValue(new Error('NotSupportedError'));
  expect(await requestLandscape(host)).toBe(false);
 });
 it('can lock without a fullscreen API when the browser permits it',async()=>{
  const host=enabled();expect(await requestLandscape({...host,requestFullscreen:undefined})).toBe(true);
  expect(host.lock).toHaveBeenCalledOnce();
 });
});
describe('portrait fallback',()=>{
 it('targets only coarse-pointer portrait and keeps the installed-app landscape hint',()=>{
  expect(MOBILE_PORTRAIT_QUERY).toBe('(pointer: coarse) and (orientation: portrait)');
  const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
  expect(manifest.orientation).toBe('landscape');
 });
 it('provides a labelled keyboard-focusable dialog, rotation guidance and an explicit action',()=>{
  const html=renderToStaticMarkup(createElement(OrientationGate,{onStart:()=>{}}));
  expect(html).toContain('role="dialog"');expect(html).toContain('aria-modal="true"');
  expect(html).toContain('aria-labelledby="orientation-title"');expect(html).toContain('tabindex="-1"');
  expect(html).toContain('화면 회전 잠금을 해제');expect(html).toContain('시작하기');
 });
 it('does not claim ongoing matches or server deadlines are paused',()=>{
  const html=renderToStaticMarkup(createElement(OrientationGate,{onStart:()=>{},playing:true}));
  expect(html).toContain('제한 시간은 계속 흐릅니다');expect(html).not.toContain('일시 정지');
 });
 it('inerts the complete app including dialogs and blocks new local games/clocks while gated',()=>{
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  expect(app).toContain('inert={mobilePortrait?true:undefined} aria-hidden={mobilePortrait?true:undefined}');
  expect(app).toContain('function start(chosenMode=mode){if(mobilePortrait)return;');
  // Only a missing local deadline is deferred; existing clocks still run.
  expect(app).toContain('if(mobilePortrait&&!clockRef.current)return;');
  expect(app).toContain('const timer=setInterval(()=>{if(clockRef.current&&Date.now()>=clockRef.current.at)');
  // The online component stays mounted under the inert wrapper: server time is authoritative.
  expect(app).toContain("{screen==='online'?<Suspense");
  expect(app).toContain("function begin(){landscape();setScreen('mode');}");
  const gate=readFileSync(new URL('../src/components/OrientationGate.tsx',import.meta.url),'utf8');
  expect(gate).toContain("event.key==='Tab'");expect(gate).toContain("event.key==='Escape'");
  expect(gate).toContain('event.stopImmediatePropagation()');
 });
});
