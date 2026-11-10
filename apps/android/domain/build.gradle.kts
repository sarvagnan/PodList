import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins { `java-library`; kotlin("jvm"); kotlin("plugin.serialization") }
kotlin {
    jvmToolchain(25)
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}
java { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
dependencies {
    api("org.jetbrains.kotlinx:kotlinx-serialization-json:1.12.0")
    testImplementation(kotlin("test-junit5"))
    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
kotlin.sourceSets.getByName("test").kotlin.srcDir("../app/src/flowRun/kotlin")
tasks.register<JavaExec>("reclassifyFlowRun") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("app.podlist.FlowRunReplayKt")
    providers.gradleProperty("flowEvidence").orNull?.let { args(it) }
}
tasks.test {
    useJUnitPlatform()
    systemProperty("podlist.protocol", rootProject.file("../../packages/domain/protocol").absolutePath)
    inputs.dir(rootProject.file("../../packages/domain/protocol"))
    inputs.file(rootProject.file("app/src/main/res/values/strings.xml"))
    testLogging { events("passed", "skipped", "failed") }
}
