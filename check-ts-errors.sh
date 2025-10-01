#!/bin/bash

# Script to check TypeScript errors across all packages in ucanto monorepo
# Usage: ./check-ts-errors.sh

set -e

echo "🔍 Checking TypeScript errors across all packages in ucanto monorepo..."
echo "================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for errors
total_errors=0
packages_with_errors=()

# List of packages to check
packages=(
    "packages/client"
    "packages/core" 
    "packages/interface"
    "packages/principal"
    "packages/server"
    "packages/transport"
    "packages/validator"
)

for package in "${packages[@]}"; do
    if [ -d "$package" ] && [ -f "$package/tsconfig.json" ]; then
        echo ""
        echo -e "${BLUE}📦 Checking $package...${NC}"
        echo "----------------------------------------"
        
        # Change to package directory and run TypeScript compiler
        cd "$package"
        
        if npx tsc --build --verbose 2>&1; then
            echo -e "${GREEN}✅ No TypeScript errors in $package${NC}"
        else
            echo -e "${RED}❌ TypeScript errors found in $package${NC}"
            ((total_errors++))
            packages_with_errors+=("$package")
        fi
        
        # Return to root directory
        cd - > /dev/null
    else
        echo -e "${YELLOW}⚠️  Skipping $package (no tsconfig.json found)${NC}"
    fi
done

echo ""
echo "================================================================="
echo -e "${BLUE}📊 SUMMARY${NC}"
echo "================================================================="

if [ $total_errors -eq 0 ]; then
    echo -e "${GREEN}🎉 SUCCESS: No TypeScript errors found in any package!${NC}"
    exit 0
else
    echo -e "${RED}💥 ERRORS FOUND: $total_errors package(s) have TypeScript errors:${NC}"
    for package in "${packages_with_errors[@]}"; do
        echo -e "${RED}  - $package${NC}"
    done
    echo ""
    echo "Please fix the TypeScript errors above."
    exit 1
fi