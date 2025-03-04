const fs1 = require("fs");
const fs = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");

const configPath = path.resolve(__dirname + "/../appconfig.json");
const appConf = JSON.parse(fs1.readFileSync(configPath, "utf-8"));

const pool = new Pool({
  user: appConf.database.master.user,
  host: appConf.database.master.host,
  database: appConf.database.master.database,
  password: appConf.database.master.password,
  port: appConf.database.master.port,
});

async function lsDir(dir) {
  const files = [];
  if (path.isAbsolute(dir)) var absPath = dir;
  else absPath = path.join(__dirname, dir);
  async function* generator(dirName) {
    const dirents = await fs.readdir(dirName, { withFileTypes: true });
    for (dirent of dirents) {
      let direntPath = path.resolve(dirName, dirent.name);
      if (dirent.isDirectory()) yield* generator(direntPath);
      else yield direntPath;
    }
  }
  for await (filePath of generator(absPath)) {
    if (path.extname(filePath) === ".sql") files.push(filePath);
    else continue;
  }
  return files;
}

var input = process.argv;
(async function dbSync(dir) {
  const files = await lsDir(dir);
  if (files.length > 0) {
    for (f of files) {
      const sql = (await fs.readFile(f)).toString();
      await pool.query(sql);
    }
    pool.end();
    console.log("[INFO] Schema created successfully");
  } else {
    console.log("[INFO] No sql file!!!");
  }
})(input[input.length - 1]);
