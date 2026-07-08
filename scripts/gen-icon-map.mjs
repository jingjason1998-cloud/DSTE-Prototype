import { icon } from '../assets/js/icons.js';
import fs from 'fs';

const keys = ['list','clipboard-text','hand-waving','magnifying-glass','bell','check','robot','calendar','warning','add','moon','gear','sign-out','building','buildings','map-trifold','chart-bar','link','star','file-text','clock','hourglass','pause','push-pin','lightbulb','arrow-up','arrow-down','package','arrows-clockwise','broadcast','confetti','fire','target','x','pencil-simple','eye','chat','paperclip','chart-line-up','trash','tag','download','rocket-launch','info','user-circle','user','map-pin','flag','caret-down','caret-up','envelope','check-circle','warning-octagon','minus'];
const map = {};
for (const k of keys) {
  const svg = icon(k, {size:'1em'});
  map[k] = { dq: svg, sq: svg.replace(/"/g, "'") };
}
fs.writeFileSync('/tmp/dste-icons.json', JSON.stringify(map, null, 2));
console.log('wrote /tmp/dste-icons.json');
