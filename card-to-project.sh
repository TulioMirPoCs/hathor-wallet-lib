#!/bin/bash

echo "Will add the PR card to the project"
PROJECT_NUMBER=1
GH_TOKEN=faketoken
PR_URL=https://github.com/TulioMirPoCs/hathor-wallet-lib/pull/9

gh project item-add $PROJECT_NUMBER \
  --owner TulioMirPoCs \
  --url "$PR_URL" \
