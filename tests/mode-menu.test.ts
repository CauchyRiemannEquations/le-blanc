import {afterEach,describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import App from '../src/App';
import AudioSettingsControls from '../src/components/AudioSettingsControls';
import {audioSettings} from '../src/audioScene';

afterEach(()=>vi.unstubAllGlobals());
describe('duel-only entry points',()=>{
 for(const search of ['', '?solo=main-anchor-v2'])it(`renders only the duel entry with help/settings for ${search||'the main menu'}`,()=>{
  const legacySave='{"schema":1,"records":[{"stageId":"useful-question","stars":3}]}';
  const getItem=vi.fn((key:string)=>key==='leblanc-solo-v1'?legacySave:null);
  const setItem=vi.fn(),removeItem=vi.fn(),clear=vi.fn();
  vi.stubGlobal('location',{search});
  vi.stubGlobal('matchMedia',()=>({matches:true}));
  vi.stubGlobal('localStorage',{getItem,setItem,removeItem,clear});
  const html=renderToStaticMarkup(createElement(App));
  expect(html).toContain('듀얼 모드');
  expect(html).toContain('플레이 방법');
  expect(html).toContain('설정');
  expect(html).not.toMatch(/솔로|solo-stage|solo-screen/);
  expect(getItem).not.toHaveBeenCalledWith('leblanc-solo-v1');
  expect(setItem).not.toHaveBeenCalled();expect(removeItem).not.toHaveBeenCalled();expect(clear).not.toHaveBeenCalled();
 });
 it('describes only retained music in settings',()=>{
  const html=renderToStaticMarkup(createElement(AudioSettingsControls,{settings:audioSettings(null),onChange:()=>{}}));
  expect(html).toContain('메뉴 · 대전 음악');
  expect(html).not.toContain('솔로');
 });
});
