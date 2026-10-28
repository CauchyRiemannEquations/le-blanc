import {describe} from './conditions';
import type {Stage} from './types';

export function ClueLetter({stage}:{stage:Stage}) {
 return <section className="solo-clues" aria-label="공개 단서" tabIndex={0}>
  <header className="clue-letter-heading"><span>확보한 단서</span><span aria-hidden="true">◇</span></header>
  <p className="solo-range">{stage.min}–{stage.max} · 중복 없이 오름차순</p>
  <p className="clue-exclusions"><b>제외 숫자</b><span>{stage.excluded.join(' · ')}</span></p>
  <ol className="clue-letter-lines">{stage.clues.filter(c=>c.kind!=='gap'||c.pair[1]!==c.pair[0]+1).map((c,i)=><li key={i}>{describe(c)}</li>)}</ol>
 </section>;
}

export function HintLetter({title,hints,disabled,onHint}:{title:string;hints:{id:number;text:string}[];disabled:boolean;onHint:()=>void}) {
 const latest=hints.at(-1);
 return <article className="hint-letter">
  <header><span className="letter-seal" aria-hidden="true">◇</span><h2>{title}</h2></header>
  {latest?<div className="letter-body" key={latest.id}><span className="letter-number">쪽지 {hints.length.toString().padStart(2,'0')}</span><p>{latest.text}</p></div>:<div className="letter-body letter-unopened"><p>막힌 곳을 풀어 줄 쪽지가 있습니다.</p></div>}
  {hints.length>1?<details className="letter-history"><summary>이전 쪽지 {hints.length-1}장</summary>{hints.slice(0,-1).map((hint,i)=><p key={hint.id}><b>{String(i+1).padStart(2,'0')}</b>{hint.text}</p>)}</details>:null}
  <footer><p>힌트를 사용한 판은 1성으로 기록됩니다.</p><button className="primary full" disabled={disabled} onClick={onHint}>{latest?'다음 힌트 보기':'힌트 보기'} <span aria-hidden="true">↗</span></button></footer>
 </article>;
}
