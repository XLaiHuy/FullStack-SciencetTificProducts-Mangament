const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/pages');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(dir);
let modifiedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // Simple regex to find <button ...> without onClick or type='submit'
  // Look for `<button ` followed by anything up to `>`, but NOT containing `onClick=` or `type="submit"`
  const regex = /<button(?![^>]*\bonClick=)(?![^>]*\btype=(?:"|'|`|\{)submit(?:"|'|`|\}))([^>]*)>/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, `<button onClick={() => alert('Chức năng đang phát triển')} $1>`);
    fs.writeFileSync(f, content, 'utf8');
    modifiedCount++;
  }
});

console.log('Modified files:', modifiedCount);
