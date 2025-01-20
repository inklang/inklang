plugins {
  alias(libs.plugins.kotlin.jvm)
  `java-library`
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