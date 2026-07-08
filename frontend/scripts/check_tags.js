const fs = require('fs');
const path = 'frontend/src/views/InformeCaja.vue';
const s = fs.readFileSync(path, 'utf8');
const t = s.match(/<template>[\s\S]*?<\/template>/);
if(!t) { console.log('No template found'); process.exit(0); }
const tpl = t[0];
const divOpen = (tpl.match(/<div(\s|>)/g) || []).length;
const divClose = (tpl.match(/<\\/div>/g) || []).length;
const pOpen = (tpl.match(/<p(\s|>)/g) || []).length;
const pClose = (tpl.match(/<\\/p>/g) || []).length;
console.log('div open=', divOpen, 'div close=', divClose, 'diff=', divOpen - divClose);
console.log('p open=', pOpen, 'p close=', pClose, 'diff=', pOpen - pClose);
