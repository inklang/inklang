import { syncKotlin, syncJavaScript, syncRepository } from "./cli/sync";

async function main () {
  const args = process.argv.slice(2);
  const command = args.shift();

  switch (command) {
    case "sync": {
      await syncRepository();
      await syncJavaScript();
      await syncKotlin();
      break;
    }
  }
}

main();
