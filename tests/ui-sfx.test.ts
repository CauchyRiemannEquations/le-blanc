import {describe,expect,it} from 'vitest';
import {uiCue} from '../src/uiSfx';
describe('one cue per UI interaction',()=>{
 it('uses a neutral press only for ordinary enabled controls',()=>{
  expect(uiCue({})).toEqual({event:'ui_press'});
  expect(uiCue({disabled:true})).toBeNull();
  expect(uiCue({event:'none'})).toBeNull();
 });
 it('semantic back and invalid cues replace presses',()=>{
  expect(uiCue({event:'ui_back'})).toEqual({event:'ui_back'});
  expect(uiCue({event:'ui_invalid'})).toEqual({event:'ui_invalid'});
 });
 it('toggle on/off are semantic states, not random variants',()=>{
  expect(uiCue({event:'ui_toggle',checked:true})).toEqual({event:'ui_toggle',state:'on'});
  expect(uiCue({event:'ui_toggle',checked:false})).toEqual({event:'ui_toggle',state:'off'});
  expect(uiCue({event:'ui_toggle'})).toBeNull();
 });
});
