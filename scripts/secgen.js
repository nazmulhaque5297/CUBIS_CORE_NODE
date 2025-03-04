const readline = require("readline");
const crypto = require("crypto");

(async function hashPassword() {
  const cmd = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  cmd.question("Secret: ", async (answer) => {
    const hash = crypto.createHash("sha256").update(answer).digest("hex");
    cmd.close();
  });
})();
