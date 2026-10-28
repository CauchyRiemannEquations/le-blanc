import {describe,expect,it} from 'vitest';
import {DealMotionEvents,FallbackRevealEvents,animationSoundCurrent,isNewPublicReveal,privatePeekCue,publicRevealCues} from '../src/tabletop/sfxEvents';

describe('tabletop presentation sound events',()=>{
 it('consumes movement starts and physical landings once, not once per frame',()=>{
  const events=new DealMotionEvents();
  expect(events.land()).toBe(false);
  expect(events.start()).toBe(true);
  for(let frame=0;frame<100;frame++)expect(events.start()).toBe(false);
  expect(events.land()).toBe(true);
  for(let frame=0;frame<100;frame++)expect(events.land()).toBe(false);
  events.reset();expect(events.start()).toBe(true);expect(events.land()).toBe(true);
 });
 it('does not resume pre-hide animation cues when the tab becomes visible',()=>{
  expect(animationSoundCurrent(false,0,0)).toBe(true);
  expect(animationSoundCurrent(true,0,0)).toBe(false);
  expect(animationSoundCurrent(false,0,1)).toBe(false);
  expect(animationSoundCurrent(false,1,1)).toBe(true);
 });
 it('only newly public cards in a new audible outcome qualify, not old history/peek',()=>{
  expect(isNewPublicReveal(false,true,0,true)).toBe(true);
  expect(isNewPublicReveal(true,true,0,true)).toBe(false);
  expect(isNewPublicReveal(false,false,0,true)).toBe(false);
  expect(isNewPublicReveal(false,true,-1,true)).toBe(false);
  expect(isNewPublicReveal(false,true,0,false)).toBe(false);
 });
 it('maps chain states by public reveal order only and never adds a first-result chain',()=>{
  expect(publicRevealCues(0,false,false)).toEqual([{event:'card_flip'}]);
  expect(publicRevealCues(1,false,false)).toEqual([{event:'card_flip'},{event:'chain',state:'low'}]);
  expect(publicRevealCues(2,false,false).at(-1)).toEqual({event:'chain',state:'mid'});
  expect(publicRevealCues(3,false,false).at(-1)).toEqual({event:'chain',state:'high'});
  expect(publicRevealCues(9,false,false).at(-1)).toEqual({event:'chain',state:'high'});
  expect(publicRevealCues(-1,false,false)).toEqual([]);
 });
 it('keeps reduced motion compact and final outcomes free of additional chain fanfares',()=>{
  expect(publicRevealCues(0,true,false)).toEqual([{event:'card_flip'}]);
  expect(publicRevealCues(1,true,false)).toEqual([]);
  expect(publicRevealCues(3,false,true)).toEqual([{event:'card_flip'}]);
  expect(publicRevealCues(3,true,true)).toEqual([]);
 });
 it('private inspection is one quiet local-only group cue with no value or state encoding',()=>{
  expect(privatePeekCue(true,true)).toEqual({event:'card_flip',gainDb:-7});
  expect(privatePeekCue(false,true)).toBeNull();
  expect(privatePeekCue(true,false)).toBeNull();
 });
});

describe('failed WebGL renderer public cues',()=>{
 it('plays one new compact event when the renderer was already failed, but not initial/history/final events',()=>{
  const events=new FallbackRevealEvents('4');
  events.observe('4',true);expect(events.take('4')).toBe(false);
  events.observe('5',true);expect(events.take('5')).toBe(true);expect(events.take('5')).toBe(false);
  events.observe('6',false);expect(events.take('6')).toBe(false);
  events.observe('6',true);expect(events.take('6')).toBe(false);
  events.observe('5',true);expect(events.take('5')).toBe(false);
 });
 it('does not replay an event when the renderer fails after a public animation cue',()=>{
  const events=new FallbackRevealEvents('0');
  events.observe('1',true);events.markPlayed('1');expect(events.take('1')).toBe(false);
  // A demand frame can precede the parent passive effect.
  events.markPlayed('2');events.observe('2',true);expect(events.take('2')).toBe(false);
 });
 it('lets fallback take an as-yet silent live event, but never queues it across hidden tabs or remounts',()=>{
  const events=new FallbackRevealEvents('0');
  events.observe('1',true);expect(events.take('1')).toBe(true);
  events.observe('2',true);events.cancel();expect(events.take('2')).toBe(false);
  const remounted=new FallbackRevealEvents('2');remounted.observe('2',true);expect(remounted.take('2')).toBe(false);
 });
});
