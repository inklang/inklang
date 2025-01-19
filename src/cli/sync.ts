import { readInkJSON, write, execute } from "./helpers";

export async function syncRepository (): Promise<void> {
  await write(".gitignore", `
.gradle/
build/
  `.trim());

  await write(".gitattributes", `
/gradlew        text eol=lf
*.bat           text eol=crlf
*.jar           binary
  `.trim());
}

export async function syncKotlin (): Promise<void> {
  const inkJSON = await readInkJSON();

  // Generate the build.gradle.kts file.
  await write("settings.gradle.kts", `
rootProject.name = ${JSON.stringify(inkJSON.name)}
val generatedKotlinDir = file("generated/kotlin")

if (generatedKotlinDir.exists()) {
  include("generated:kotlin")
}
else {
  println("Skipping inclusion of 'generated:kotlin' as the directory does not exist.")
}
  `.trim());

  await write("gradle.properties", `
org.gradle.configuration-cache=true
  `.trim());

  /**
   * Should generate the following files:
   * - gradle/wrapper/gradle-wrapper.jar
   * - gradle/wrapper/gradle-wrapper.properties
   * - gradlew
   * - gradlew.bat
   */
  await execute("gradle", ["wrapper"]);

  // Generate the libs.version.toml file for dependencies.
  await write("gradle/libs.version.toml", `
[versions]
kotlin = "2.0.21"

[libraries]

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
  `.trim());
}

export async function syncJavaScript (): Promise<void> {
  const inkJSON = await readInkJSON();

  // Generate the package.json file.
  await write("package.json", JSON.stringify({
    name: inkJSON.name,
    version: inkJSON.version,
    repository: inkJSON.git,
    sideEffects: false,
    main: "./generated/javascript/index.cjs",
    module: "./generated/javascript/index.mjs",
    types: "./generated/javascript/index.d.ts",
    exports: {
      types: "./generated/javascript/index.d.ts",
      import: "./generated/javascript/index.mjs",
      require: "./generated/javascript/index.cjs"
    },
    files: [
      "generated/javascript"
    ],
    dependencies: {},
    devDependencies: {}
  }, null, 2));
}
