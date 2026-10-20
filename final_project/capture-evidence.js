'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const evidence = path.join(__dirname, 'evidence');
fs.mkdirSync(evidence, {recursive:true});
const cookie = path.join(__dirname, 'cookies.txt');
const results = {};
function curl(args) {
  const r = spawnSync('curl.exe', ['-sS','--fail-with-body','--max-time','20',...args], {encoding:'utf8'});
  if (r.status !== 0) throw new Error(`${r.status}: ${r.stderr} ${r.stdout}`);
  return r.stdout.trim();
}
function save(name, blocks) {
  const text=blocks.map(([command,output])=>`${command}\n${output}`).join('\n\n')+'\n';
  fs.writeFileSync(path.join(evidence,name),text);
  results[name]=text;
}
const repo=JSON.parse(curl(['https://api.github.com/repos/Alikhan808/expressBookReviews']));
assert.equal(repo.fork,true);
assert.equal(repo.parent.full_name,'ibm-developer-skills-network/expressBookReviews');
const repoFilter="JSON.stringify((r=>({repository:r.full_name,fork:r.fork,parent:r.parent.full_name}))(JSON.parse(require('fs').readFileSync(0,'utf8'))),null,2)";
const raw=JSON.stringify(repo);
const filtered=spawnSync(process.execPath,['-pe',repoFilter],{input:raw,encoding:'utf8'}).stdout.trim();
save('githubrepo',[[`curl -sS https://api.github.com/repos/Alikhan808/expressBookReviews | node -pe "${repoFilter}"`,filtered]]);
const base='http://127.0.0.1:5000';
for(const [name,url] of [['getallbooks','/'],['getbooksbyISBN','/isbn/1'],['getbooksbyauthor','/author/Unknown'],['getbooksbytitle','/title/Things%20Fall%20Apart'],['getbookreview','/review/1']]) {
  const output=curl([base+url]);
  JSON.parse(output);
  if(name==='getbookreview')assert.deepEqual(JSON.parse(output),{});
  save(name,[[`curl -sS "${base+url}"`,output]]);
}
const credentials=JSON.stringify({username:'alikhan_demo',password:'DemoBookPass123'});
const register=curl(['-X','POST',base+'/register','-H','Content-Type: application/json','-d',credentials]);
assert.equal(JSON.parse(register).message,'User successfully registered. You can now log in.');
save('register',[[`curl -sS -X POST "${base}/register" -H "Content-Type: application/json" -d '${credentials}'`,register]]);
const login=curl(['-X','POST',base+'/customer/login','-H','Content-Type: application/json','-d',credentials,'-c',cookie]);
assert.equal(JSON.parse(login).username,'alikhan_demo');
save('login',[[`curl -sS -X POST "${base}/customer/login" -H "Content-Type: application/json" -d '${credentials}' -c cookies.txt`,login]]);
const reviewBlocks=[];
for(const [review,message] of [['A powerful and thought-provoking novel.','Book review successfully added.'],['An excellent novel with memorable characters and important cultural themes.','Book review successfully updated.']]) {
  const data=JSON.stringify({review});
  const output=curl(['-X','PUT',base+'/customer/auth/review/1','-H','Content-Type: application/json','-d',data,'-b',cookie]);
  assert.equal(JSON.parse(output).message,message);
  assert.equal(JSON.parse(output).reviews.alikhan_demo,review);
  reviewBlocks.push([`curl -sS -X PUT "${base}/customer/auth/review/1" -H "Content-Type: application/json" -d '${data}' -b cookies.txt`,output]);
}
reviewBlocks.push([`curl -sS "${base}/review/1"`,curl([base+'/review/1'])]);
save('reviewadded',reviewBlocks);
const deleted=curl(['-X','DELETE',base+'/customer/auth/review/1','-b',cookie]);
assert.deepEqual(JSON.parse(deleted),{message:'Book review successfully deleted.',reviews:{}});
save('deletereview',[[`curl -sS -X DELETE "${base}/customer/auth/review/1" -b cookies.txt`,deleted]]);
fs.writeFileSync(path.join(evidence,'answers.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
