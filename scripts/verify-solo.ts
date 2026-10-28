import {STAGES} from '../src/solo/stages';
import {verifyStage} from '../src/solo/verification';
console.log(JSON.stringify(STAGES.map(verifyStage),null,2));
