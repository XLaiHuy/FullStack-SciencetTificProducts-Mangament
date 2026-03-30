const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/pages');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(dir);
let modifiedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let touched = false;

  const newContent = content.replace(/<button([^>]*)>([\s\S]*?)<\/button>/g, (fullMatch, attrs, innerText) => {
    if (attrs.includes('onClick') || attrs.includes('type="submit"') || attrs.includes("type='submit'") || attrs.includes('type={')) {
      return fullMatch;
    }
    
    let action = "Chức năng đang phát triển";
    const innerLower = innerText.toLowerCase();
    
    if (innerLower.includes("xem") || innerLower.includes("chi tiết") || innerLower.includes("detail")) action = "Hiển thị chi tiết bản ghi (Mock)";
    else if (innerLower.includes("sửa") || innerLower.includes("chỉnh") || innerLower.includes("edit")) action = "Chuyển đến trang chỉnh sửa (Mock)";
    else if (innerLower.includes("thêm") || innerLower.includes("add")) action = "Mở form thêm mới (Mock)";
    else if (innerLower.includes("xóa") || innerLower.includes("delete")) action = "Xác nhận xóa bản ghi (Mock)";
    else if (innerLower.includes("lưu") || innerLower.includes("save")) action = "Lưu dữ liệu thành công! (Mock)";
    else if (innerLower.includes("tải") || innerLower.includes("download")) action = "Bắt đầu tải tệp xuống... (Mock)";
    else if (innerLower.includes("gửi") || innerLower.includes("send")) action = "Đã gửi thành công! (Mock)";

    touched = true;
    return fullMatch.replace('<button', `<button onClick={() => alert('${action}')}`);
  });
  
  if (touched && newContent !== content) {
    fs.writeFileSync(f, newContent, 'utf8');
    modifiedCount++;
    console.log("Modified:", f);
  }
});

console.log('Total modified files:', modifiedCount);
