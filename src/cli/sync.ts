import { readInkJSON, write, execute, mkdir, exists } from "./helpers";

export async function syncRepository (): Promise<void> {
  await write(".gitignore", `
node_modules/
.gradle/
target/
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

  await mkdir("generated/kotlin");
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
  const ink = await readInkJSON();

  // Generate the package.json file.
  await write("package.json", JSON.stringify({
    name: ink.name,
    version: ink.version,
    repository: ink.git,
    description: ink.description,
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

  await execute("pnpm", ["add", "-D", "typescript@latest"]);

  await write("tsconfig.json", JSON.stringify({
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "Bundler",

      strict: true,
      noEmit: true,
      skipLibCheck: true,

      baseUrl: ".",
      paths: {
        [ink.name]: ["generated/javascript"],
      },

      isolatedModules: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true
    },

    include: ["examples/javascript", "generated/javascript"],
    exclude: ["node_modules"]
  }, null, 2));

  await execute("pnpm", ["add", ...ink.annotations.map((annotation) => `@inklang/${annotation}@latest`)]);
}

export async function syncRust (): Promise<void> {
  const ink = await readInkJSON();

  if (!await exists("generated/rust/lib.rs")) {
    await mkdir("generated/rust");
    await write("generated/rust/lib.rs", "// Empty file to avoid errors.");
  }

  await write("Cargo.toml", `
[package]
name = ${JSON.stringify(ink.name)}
version = ${JSON.stringify(ink.version)}
edition = "2021"

[lib]
path = "generated/rust/lib.rs"

[dependencies]
  `.trim());

  await execute("cargo", ["update"]);
}
