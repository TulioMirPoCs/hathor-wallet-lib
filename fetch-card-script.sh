#!/bin/bash
#export GH_TOKEN=abc123

PROJECT_NUMBER=1
PR_URL=https://github.com/TulioMirPoCs/hathor-wallet-lib/pull/12

# Check if both arguments are provided
if [ -z "$PROJECT_NUMBER" ] || [ -z "$PR_URL" ]; then
    echo "Error: Both project number and PR URL must be provided."
    return 1
fi

#gh project item-add "$PROJECT_NUMBER" --owner "@me" --url "$PR_URL"
ORG_NAME="TulioMirPoCs"
PR_URL="https://github.com/TulioMirPoCs/hathor-wallet-lib/pull/14"
QUERY="
          query {
            organization(login: \"$ORG_NAME\") {
              projectV2(number: $PROJECT_NUMBER) {
                items(first: 10) {
                  nodes {
                    id
                    content {
                      ... on Issue {
                        id
                        title
                        number
                        repository {
                          owner {
                            login
                          }
                          name
                        }
                        url
                      }
                      ... on PullRequest {
                        id
                        title
                        number
                        repository {
                          owner {
                            login
                          }
                          name
                        }
                        url
                      }
                    }
                  }
                }
              }
           }
          }
          "
          PROJ_RESPONSE=$(gh api graphql -f query="$QUERY")
          echo "Response: $PROJ_RESPONSE"

          CARD_ID=$(echo "$PROJ_RESPONSE" | jq -r --arg pr_url "$PR_URL" '
            .data.organization.projectV2.items.nodes[]
            | select(.content.url == $pr_url)
            | .id')

          echo "CARD_ID: $CARD_ID"
