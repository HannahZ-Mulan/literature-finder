const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3("sqlite.db");
const insert = db.prepare("INSERT INTO literature (title, authors, abstract, source, pdf_url) VALUES (?, ?, ?, ?, ?)");
const titles = ["Test Paper 1", "Test Paper 2"];
titles.forEach(title => {
  insert.run(title, JSON.stringify([{name: "Test Author"}]), "Test abstract", "arxiv", "https://arxiv.org/pdf/1234.5678.pdf");
});
console.log("Added " + title + " to database");
insert.finalize();
db.close();
