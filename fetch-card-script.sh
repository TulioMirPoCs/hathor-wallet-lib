#!/bin/bash
#export GH_TOKEN=abc123

#gh project item-add "$PROJECT_NUMBER" --owner "@me" --url "$PR_URL"
ORG_NAME="TulioMirPoCs"
PR_NUMBER=18
REPO_NAME=hathor-wallet-lib
QUERY="
  query {
    repository(owner: \"$ORG_NAME\", name: \"$REPO_NAME\") {
      pullRequest(number: $PR_NUMBER) {
        id
      }
    }
  }"
PROJ_RESPONSE=$(gh api graphql -f query="$QUERY")

CARD_ID=$(echo "$PROJ_RESPONSE" | jq -r '.data.repository.pullRequest.id')

echo "CARD_ID: $CARD_ID"
