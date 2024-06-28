#!/bin/bash
#export GH_TOKEN=abc123

CARD_ID="PVTI_lADOClPehc4AjhxqzgQfuXE"
PROJECT_ID="PVT_kwDOClPehc4Ajhxq"
FIELD_ID="PVTSSF_lADOClPehc4Ajhxqzgb4D48"
OPTION_ID="47fc9ee4"
QUERY="
          mutation {
            updateProjectV2ItemFieldValue(
              input: {
                projectId: \"$PROJECT_ID\",
                itemId: \"$CARD_ID\",
                fieldId: \"$FIELD_ID\",
                value: {
                  singleSelectOptionId: \"$OPTION_ID\"
                }
              }
            ) {
              projectV2Item {
                id
              }
            }
          }
          "
          PROJ_RESPONSE=$(gh api graphql -f query="$QUERY")
          echo "Response: $PROJ_RESPONSE"
