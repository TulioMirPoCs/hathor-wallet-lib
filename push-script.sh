#!/bin/bash
export GH_TOKEN=abc123

PROJECT_NUMBER=1
PR_URL=https://github.com/TulioMirPoCs/hathor-wallet-lib/pull/12

# Check if both arguments are provided
if [ -z "$PROJECT_NUMBER" ] || [ -z "$PR_URL" ]; then
    echo "Error: Both project number and PR URL must be provided."
    return 1
fi

#gh project item-add "$PROJECT_NUMBER" --owner "@me" --url "$PR_URL"
ORG_NAME="TulioMirPoCs"
QUERY="
query {
  organization(login: \"$ORG_NAME\") {
    projectV2(number: $PROJECT_NUMBER) {
      id
      field(name: \"Status\") {
        __typename
        ...on ProjectV2SingleSelectField {
          id
          options {
            id
            name
          }
        }
      }
    }
  }
}
"
PROJ_RESPONSE=$(gh api graphql -f query="$QUERY")
echo "Response: $PROJ_RESPONSE"

echo "$PROJ_RESPONSE" | jq -r '
  .data.organization.projectV2.id as $projectId |
  .data.organization.projectV2.field.id as $fieldId |
  .data.organization.projectV2.field.options[] |
  select(.name == "In Progress") |
  {
    projectId: $projectId,
    fieldId: $fieldId,
    optionId: .id
  }
  '
