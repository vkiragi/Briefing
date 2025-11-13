#!/bin/bash

# Test script for Briefing CLI tool
# Tests all major functionality

echo "========================================"
echo "Testing Briefing CLI Tool"
echo "========================================"
echo ""

echo "1. Testing version command..."
briefing --version
echo ""

echo "2. Listing available news sources..."
briefing news --list-sources
echo ""

echo "3. Listing available sports..."
briefing sports --list-sports
echo ""

echo "4. Testing news fetch (BBC only, 3 items)..."
briefing --no-links news --sources bbc 2>&1 | head -20
echo ""

echo "5. Testing sports scores (NFL, 3 items)..."
briefing sports --sport nfl --scores --limit 3 2>&1 | head -15
echo ""

echo "6. Testing help command..."
briefing --help | head -15
echo ""

echo "========================================"
echo "All tests completed!"
echo "========================================"
