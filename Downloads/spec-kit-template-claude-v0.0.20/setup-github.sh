#!/bin/bash

# GitHub Repository Setup Script
# Run this after creating your repository on GitHub

echo "GitHub Repository Setup for Research Study Management System"
echo "============================================================"
echo ""

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter your repository name (default: research-study-management): " REPO_NAME
REPO_NAME=${REPO_NAME:-research-study-management}

echo ""
echo "Setting up remote for: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo ""

# Remove existing remote if it exists
git remote remove origin 2>/dev/null

# Add new remote
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo "Remote configured successfully!"
echo ""
echo "Current branch: $(git branch --show-current)"
echo "Commits ready to push:"
git log --oneline -5
echo ""

# Ask if user wants to push now
read -p "Do you want to push now? (y/n): " PUSH_NOW

if [ "$PUSH_NOW" = "y" ] || [ "$PUSH_NOW" = "Y" ]; then
    echo "Pushing to GitHub..."
    git push -u origin 001-research-study-management
    echo ""
    echo "✅ Success! Your code is now on GitHub at:"
    echo "   https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "You can create a Pull Request at:"
    echo "   https://github.com/$GITHUB_USERNAME/$REPO_NAME/pull/new/001-research-study-management"
else
    echo ""
    echo "To push later, run:"
    echo "   git push -u origin 001-research-study-management"
fi