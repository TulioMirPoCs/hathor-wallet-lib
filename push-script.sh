#!/bin/bash
export GH_TOKEN=abc123

PROJECT_NUMBER=1
PR_URL=$1

# Check if both arguments are provided
if [ -z "$PROJECT_NUMBER" ] || [ -z "$PR_URL" ]; then
    echo "Error: Both project number and PR URL must be provided."
    return 1
fi

gh project item-add "$PROJECT_NUMBER" --owner "@me" --url "$PR_URL"
