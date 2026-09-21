# Build context is api/:  podman build -t krahler-api api
FROM docker.io/library/maven:3-eclipse-temurin-26 AS build
WORKDIR /src
# Dependencies first, so editing source doesn't re-download them.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM docker.io/library/eclipse-temurin:25-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /src/target/api-*.jar app.jar
USER app
EXPOSE 8080
# Container Apps kills the process on a new revision, so start-up time matters; these flags trade a little peak speed for a faster start and a smaller footprint.
ENTRYPOINT ["java", "-XX:TieredStopAtLevel=1", "-XX:+UseSerialGC", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
