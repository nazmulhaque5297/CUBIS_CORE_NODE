const readline = require("readline");
const bcryptjs = require("bcryptjs");

(async function hashPassword() {
  const cmd = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  cmd.question("Password: ", async (answer) => {
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(answer, salt);
    console.log({ Hash_Password: hash });
    cmd.close();
  });
})();
