import type { VisibleTile } from '../engine/types';
import TileRow from './TileRow';
/** Only mounted after the engine/server has finished the match and released both hands. */
export default function FinalBoard({hands,winner,reduced}:{hands:{name:string;tiles:VisibleTile[]}[];winner:number;reduced:boolean}) {
 return <div className="final-boards">{[winner,1-winner].map(player=><section className="final-hand" key={player}>
  <h3><span>{hands[player].name}</span><small>{player===winner?'승리':'패배'}</small></h3>
  <TileRow tiles={hands[player].tiles} compact reduced={reduced} label={`${hands[player].name} · 최종 암호`}/>
 </section>)}</div>;
}
