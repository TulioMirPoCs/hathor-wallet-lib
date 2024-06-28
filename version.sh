NEW_VERSION=$(npm version patch)
git push origin "$NEW_VERSION"
