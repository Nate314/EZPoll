#!/usr/bin/env bash
# Starts this project through the shared launcher, the git submodule in ./compose-launcher
# (https://github.com/Nate314/compose-launcher). The ports and printed URLs are in run.conf.
set -eu
cd "$(dirname "$0")"
if [ ! -f compose-launcher/run.sh ]; then
  git submodule update --init compose-launcher || {
    echo "run.sh: could not fetch the compose-launcher submodule. This needs a git clone of the project (not a zip download) and network access." >&2
    exit 1
  }
fi
exec bash compose-launcher/run.sh "$@"
