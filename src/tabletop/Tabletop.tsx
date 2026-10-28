import {Component,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Canvas} from '@react-three/fiber';
import {useReducedMotion} from 'motion/react';
import Scene from './Scene';
import type {HitLayout} from './Scene';
import type {SceneData} from './model';
import TileRow from '../components/TileRow';
import './tabletop.css';
class RenderBoundary extends Component<{children:ReactNode;fallback:ReactNode;onError:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?this.props.fallback:this.props.children;}}
interface Props {data:SceneData;peek?:boolean;onPeek?:()=>void;selected?:number[];onSelect?:(i:number)=>void;enabled?:(i:number)=>boolean;reduced:boolean;eventId?:string;revealIds?:string[];label?:string;resetKey?:string;layout?:'play'|'tool'|'menu';dealing?:boolean;onDealt?:()=>void;portalTarget?:HTMLDivElement|null}
export default function Tabletop({data,peek=false,onPeek,selected=[],onSelect,enabled=()=>true,reduced,eventId='',revealIds=[],label='상대의 암호',layout:placement='play',dealing=false,onDealt,portalTarget}:Props){
 const [hits,setHits]=useState<HitLayout>({central:[],near:[]}),[page,setPage]=useState(0),[failed,setFailed]=useState(false),[ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[progress,setProgress]=useState(0);const preference=useReducedMotion(),reduce=reduced||!!preference;
 const done=useRef(onDealt);done.current=onDealt;
 const layout=useCallback((central:HitLayout)=>setHits(previous=>JSON.stringify(previous)===JSON.stringify(central)?previous:central),[]);
 const sceneReady=useCallback(()=>setLoaded(true),[]);
 const fail=useCallback(()=>setFailed(true),[]);
 // Presentation only: the engine has already dealt the cards. Never restart the turn on a render.
 useEffect(()=>{if(!dealing||(!loaded&&!failed))return;if(reduce||failed){done.current?.();return;}const start=performance.now();const timer=setInterval(()=>{const elapsed=performance.now()-start;setProgress(Math.min(10,Math.floor(elapsed/170)));if(elapsed>=2400){clearInterval(timer);done.current?.();}},50);return()=>clearInterval(timer);},[dealing,loaded,reduce,failed]);
 const pages=Math.max(1,Math.ceil(data.hand.length/5)),visiblePage=Math.min(page,pages-1);
 const referencePage=data.reference?data.hand.slice(visiblePage*5,visiblePage*5+5):data.hand;
 const fallback=<div className="tabletop-fallback"><p>3D 화면을 사용할 수 없어 간소화된 암호판을 표시합니다.</p><TileRow tiles={data.central} connections={data.connections} onSelect={onSelect} selected={selected} enabled={enabled} label={label}/><TileRow tiles={referencePage} label={data.reference?'제외 숫자':'나의 카드'}/></div>;
 const controls=<>{failed&&portalTarget?fallback:null}   {ready&&!failed&&!dealing&&placement!=='menu'?<>
    <div className="tabletop-hits" role="group" aria-label={label}>{data.central.map((c,i)=><button key={c.id} className="card-hit" aria-label={`${c.slot+1}번 타일, ${c.value===null?'비공개':c.value}`} aria-pressed={selected.includes(c.slot)} disabled={!onSelect||!enabled(c.slot)} onClick={()=>onSelect?.(c.slot)} style={hits.central[i]?{left:hits.central[i].x,top:hits.central[i].y,width:hits.central[i].width,height:hits.central[i].height}:{display:'none'}}><span className="sr-only">{c.slot+1}번</span></button>)}</div>
    <div className="tabletop-hits near-hits" role="group" aria-label={data.reference?'제외 숫자':'나의 카드'}>{referencePage.map((c,i)=><button key={c.id} className="card-hit" aria-label={data.reference?`제외 숫자 ${c.value}`:`${c.slot+1}번 타일, ${c.value===null?'비공개':c.value}${c.revealed?', 상대에게 공개됨':c.value===null?', 가려짐':', 나만 볼 수 있음'}`} disabled tabIndex={-1} style={hits.near[i]?{left:hits.near[i].x,top:hits.near[i].y,width:hits.near[i].width,height:hits.near[i].height}:{display:'none'}}><span className="sr-only">{c.slot+1}번</span></button>)}</div>
   </>:null}
  {!dealing&&placement!=='menu'?<div className="tabletop-hand-bar">{!data.reference?<button className="hand-toggle" aria-label={peek?'확인 닫기':'내 숫자 확인'} onClick={onPeek} aria-expanded={peek}>{peek?'확인 닫기':'내 숫자 확인'}</button>:data.hand.length>5?<button onClick={()=>{setPage((visiblePage+1)%pages);}}>다음 단서 {visiblePage+1}/{pages}</button>:null}</div>:null}
</>;
 return <section className="tabletop" data-testid="tabletop" data-mode={data.reference?'solo':'duel'} data-ready={ready} data-event={eventId} data-layout={placement} data-dealing={dealing}>
  <div className="tabletop-viewport">
   {failed?(portalTarget?null:fallback):<RenderBoundary fallback={fallback} onError={fail}><Suspense fallback={<p className="tabletop-loading">탁자를 준비합니다…</p>}><Canvas shadows dpr={[1,1.5]} frameloop="demand" camera={{fov:40,near:.1,far:60}} gl={{antialias:true,alpha:false,powerPreference:'low-power'}} fallback={<p>3D 화면을 사용할 수 없습니다.</p>} onCreated={({gl})=>{setReady(true);gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setFailed(true);},{once:true});}}>
    <Suspense fallback={null}><Scene data={data} peek={peek} selected={selected} page={visiblePage} reduced={reduced||!!preference} eventId={eventId} revealIds={revealIds} onSelect={i=>{if(!dealing&&enabled(i))onSelect?.(i);}} onLayout={layout} placement={placement} dealing={dealing} onReady={sceneReady}/></Suspense>
   </Canvas></Suspense></RenderBoundary>}
  </div>
  {portalTarget?createPortal(controls,portalTarget):controls}
  {dealing?<div className="deal-hud" data-testid="dealing-screen"><span>카드를 나눕니다</span><progress aria-label="카드 배분" max={10} value={progress}/><button onClick={()=>done.current?.()}>건너뛰기</button></div>:null}
 </section>;
}
