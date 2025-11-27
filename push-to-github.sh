#!/bin/bash

# Script to push code to GitHub repository: whatsapp-channel-lawgger
# Make sure you've created the repository on GitHub first!

echo "🚀 Pushing code to GitHub..."
echo ""

# Check if remote already exists
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GitHub username is required!"
    exit 1
fi

# Add remote
echo ""
echo "📡 Adding remote repository..."
git remote add origin https://github.com/${GITHUB_USERNAME}/whatsapp-channel-lawgger.git

# Push to GitHub
echo ""
echo "⬆️  Pushing code to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code has been pushed to GitHub!"
    echo "🌐 Repository URL: https://github.com/${GITHUB_USERNAME}/whatsapp-channel-lawgger"
else
    echo ""
    echo "❌ Push failed. Make sure you've created the repository on GitHub first!"
    echo "   Go to: https://github.com/new"
    echo "   Repository name: whatsapp-channel-lawgger"
    echo "   Then run this script again."
fi

