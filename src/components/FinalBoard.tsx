import type { VisibleTile } from '../engine/types';
import TileRow from './TileRow';
/** The decoded opponent is the visual focus; the other hand remains inspectable. */
export default function FinalBoard({hands,winner,reduced}:{hands:{name:string;tiles:VisibleTile[]}[];winner:number;reduced:boolean}) {
 const decoded=hands[1-winner],other=hands[winner];
 return <div className="final-boards"><div className="decoded-board"><TileRow tiles={decoded.tiles} reduced={reduced} label={`${decoded.name} · 최종 암호`}/></div><details className="other-final-hand"><summary>다른 패 확인</summary><TileRow tiles={other.tiles} compact reduced={reduced} label={`${other.name} · 최종 암호`}/></details></div>;
}
