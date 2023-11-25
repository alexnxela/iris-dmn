export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1

rm -rf jdk-11.0.11+9-jre
curl -LJO https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jre_x64_linux_hotspot_11.0.21_9.tar.gz
tar -xvf OpenJDK11U-jre_x64_linux_hotspot_11.0.21_9.tar.gz
rm OpenJDK11U-jre_x64_linux_hotspot_11.0.21_9.tar.gz

docker-compose build --progress plain