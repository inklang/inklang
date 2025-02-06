import path from "node:path";

import { syncKotlin, syncJavaScript, syncRepository } from "./cli/sync";
import { parse, TranslatorJS, TranslatorKotlin, TranslatorTS } from "./index";
import { mkdir, readInkJSON, readTextFile, write } from "./cli/helpers";

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
    case "generate": {
      const entrypoint = path.resolve("./src/main.ink");
      const code = await readTextFile(entrypoint);
      const statements = parse(code, entrypoint);

      switch (args.shift()) {
        case "javascript": {
          const cjs = new TranslatorJS(statements, "cjs").translate();
          const mjs = new TranslatorJS(statements, "mjs").translate();
          const dts = new TranslatorTS(statements).translate();

          await mkdir("generated/javascript");
          await write("generated/javascript/index.cjs", cjs);
          await write("generated/javascript/index.mjs", mjs);
          await write("generated/javascript/index.d.ts", dts);

          break;
        }
        case "kotlin": {
          const code = new TranslatorKotlin(statements).translate();

          const inkJSON = await readInkJSON();
          const libSubPath = inkJSON.package.replace(/\./g, "/");

          const libDir = `generated/kotlin/src/main/${libSubPath}`;
          await mkdir(libDir);

          await write(`${libDir}/${inkJSON.displayName}.kt`, code);
          await write("generated/kotlin/build.gradle.kts", `
plugins {
  alias(libs.plugins.kotlin.jvm)
  \`java-library\`
}

repositories {
  mavenCentral()
}

dependencies {

}

java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(17)
  }
}
          `.trim());
          break;
        }
        default: {
          throw new Error(`unknown language: javascript, kotlin`);
        }
      }

      break;
    }
    default: {
      throw new Error(`unknown command, available: sync, generate`);
    }
  }
}

main();
