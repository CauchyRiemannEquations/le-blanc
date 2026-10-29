import {preloadVoice} from '../audio';
import {lazy,Suspense,useEffect,useMemo,useState} from 'react';
import type {GameView,Outcome} from '../engine/types';
import {duelScene} from './model';
import {outcomeCue} from '../gameSfx';
import {TableTargets,useTableInteraction} from './Interaction';
const Tabletop=lazy(()=>import('./Tabletop'));
interface Props {view:GameView;reduced:boolean;event?:Outcome|null;eventSfx?:boolean;selected?:number[];onSelect?:(i:number)=>void;enabled?:(i:number)=>boolean;label?:string;layout?:'play'|'tool';dealing?:boolean;onDealt?:()=>void}
export default function DuelTable({view,reduced,event,eventSfx=true,selected,onSelect,enabled,label,layout,dealing=false,onDealt}:Props){
 const interaction=useTableInteraction();
 useEffect(()=>{for(const voice of new Set(view.voices??(['jongdae','jongdae'] as const)))preloadVoice(['AMB_01','INF_04','INF_05'],voice);},[view.voices?.[0],view.voices?.[1]]);
 const [peek,setPeek]=useState(false);const sequence=view.history.at(-1)?.id??0,resetKey=`${view.player}-${view.turn}-${sequence}`;
 useEffect(()=>setPeek(false),[resetKey]);
 useEffect(()=>{const hide=()=>{if(document.hidden)setPeek(false);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 const data=useMemo(()=>{const scene=duelScene(view,peek&&!dealing);return dealing?{...scene,central:scene.central.map(c=>({...c,value:null})),hand:scene.hand.map(c=>({...c,value:null}))}:scene;},[view,peek,dealing]);
 if(layout==='tool')return <TableTargets selected={selected} onSelect={onSelect} enabled={enabled} label={label}/>;
 const binding=interaction?.binding;
 const compactCue=event&&event.reveals.length>1&&event.success!==false?outcomeCue(event,!!view.result,true):null;
 // An online auto-penalty may already be represented by the failed-attack cue.
 const fallbackCue=compactCue?.event==='penalty_reveal'?{event:'card_flip' as const}:compactCue;
 return <Suspense fallback={<section className="tabletop tabletop-boot" data-testid="tabletop-boot"><p className="tabletop-loading">탁자를 준비합니다…</p></section>}><Tabletop portalTarget={interaction?.target} layout="play" dealing={dealing} onDealt={onDealt} data={data} peek={peek} onPeek={()=>setPeek(p=>!p)} reduced={reduced} selected={binding?.selected??selected} onSelect={binding?binding.onSelect:onSelect} enabled={binding?binding.enabled:enabled} label={binding?.label??label} resetKey={resetKey} eventId={String(sequence)} eventSfx={eventSfx} fallbackCue={fallbackCue} finalResult={!!view.result} revealIds={(event?.reveals??[]).map(r=>`${r.player===view.player?'own':'opponent'}-${r.index}`)}/></Suspense>;
}
