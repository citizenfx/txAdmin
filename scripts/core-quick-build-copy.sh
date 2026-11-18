#!/bin/bash

set -e

# Building
GITHUB_REF="refs/tags/v7.7.7" npx tsx scripts/build/publish.ts

# Windows
TARGET_PATH_WIN=/e/FiveM/28108/citizen/system_resources/monitor
echo "Copying build files to ${TARGET_PATH_WIN}..."
rm -rf "${TARGET_PATH_WIN}/core"
mkdir -p $TARGET_PATH_WIN
cp -r ./dist/core $TARGET_PATH_WIN

# Container
TARGET_PATH_DOCKER=/c/Users/tabarra/Desktop/PROGRAMMING/fxserver-container/server/alpine/opt/cfx-server/citizen/system_resources/monitor
echo "Copying build files to ${TARGET_PATH_DOCKER}..."
rm -rf "${TARGET_PATH_DOCKER}/core"
mkdir -p $TARGET_PATH_DOCKER
cp -r ./dist/core $TARGET_PATH_DOCKER


echo "Done."
