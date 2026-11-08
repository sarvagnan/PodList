import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins { `java-library`; kotlin("jvm"); kotlin("plugin.serialization") }
kotlin {
    jvmToolchain(25)
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}
java { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
dependencies {
    api(project(":domain"))
    api("androidx.sqlite:sqlite-bundled:2.7.1")
    testImplementation(kotlin("test-junit5"))
    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
tasks.test {
    useJUnitPlatform()
    systemProperty("podlist.protocol", rootProject.file("../../packages/domain/protocol").absolutePath)
    systemProperty("podlist.repo", rootProject.file("../..").absolutePath)
    inputs.dir(rootProject.file("../../packages/domain/protocol"))
    inputs.files(rootProject.file("../../packages/domain/src/Sql.ts"), rootProject.file("../../packages/web/src/platform/LocalDb.ts"))
    testLogging { events("passed", "skipped", "failed") }
}
