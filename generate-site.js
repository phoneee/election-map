const hbs = require('handlebars');
const fs = require('fs');

const template = {
  index: hbs.compile(fs.readFileSync('./templates/index.html', 'utf8')),
  share: hbs.compile(fs.readFileSync('./templates/share.html', 'utf8'))
};

const partySource = fs.readFileSync('./dist/data/party.json', 'utf8');
const partyList = JSON.parse(partySource);
const HOSTNAME = process.env.ENV === 'production'
  ? 'https://elect.in.th/election-map'
  : (process.env.HOSTNAME || 'http://127.0.0.1:8080');

const meta = {
  fb_app_id: '171048360504115',
  fb_pixel_id: '1867967129974391',
  ga_id: 'UA-43653558-19',
  mapbox_token: 'pk.eyJ1IjoibGJ1ZCIsImEiOiJCVTZFMlRRIn0.0ZQ4d9-WZrekVy7ML89P4A',
  title: 'พรรคไหนส่งผู้สมัครเขตไหนบ้าง?',
  description: 'พรรคไหน ส่งผู้สมัครเขตไหนบ้าง? เช็คข้อมูลกันได้ที่นี่',
  keywords: 'การเมือง, เลือกตั้ง, ประชาธิปไตย, การเมืองไทย, election, politics, democracy, thai politics, visualization, infographic, interactive, data journalism',
  hostname: HOSTNAME,
  map_hostname: 'https://rapee.github.io/election-map'
};

let output
// index page
output = template.index(meta);
fs.writeFileSync(`./dist/index.html`, output, 'utf8');

// share pages
partyList.forEach(party => {
  const data = Object.assign({}, meta, {
    party: party.name
  });
  output = template.share(data);
  fs.writeFileSync(`./dist/p/${party.name}.html`, output, 'utf8');
});
