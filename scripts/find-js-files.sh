#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Scanning for JavaScript files without TypeScript counterparts...${NC}\n"

# Initialize counters
total_js=0
missing_ts=0

# Directories to search in
directories=(
    "/Users/albertolive/Repos/que-fer/components"
    "/Users/albertolive/Repos/que-fer/pages"
    "/Users/albertolive/Repos/que-fer/utils"
    "/Users/albertolive/Repos/que-fer/hooks"
    "/Users/albertolive/Repos/que-fer/lib"
)

# Files to ignore
ignore_files=(
    "next.config.js"
    "postcss.config.js"
    "tailwind.config.js"
    "jest.config.js"
    "jest.setup.js"
)

# Function to check if file should be ignored
should_ignore() {
    local file="$1"
    for ignore in "${ignore_files[@]}"; do
        if [[ "$file" == *"$ignore" ]]; then
            return 0
        fi
    done
    return 1
}

echo -e "${GREEN}Checking directories:${NC}"
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "- $dir"
    fi
done
echo ""

# Find all .js files
for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        continue
    fi
    
    while IFS= read -r js_file; do
        # Skip if file should be ignored
        if should_ignore "$js_file"; then
            continue
        fi
        
        ((total_js++))
        
        # Convert .js path to potential .tsx and .ts paths
        ts_file="${js_file%.js}.tsx"
        ts_file_api="${js_file%.js}.ts"
        
        # Check if neither .tsx nor .ts version exists
        if [ ! -f "$ts_file" ] && [ ! -f "$ts_file_api" ]; then
            ((missing_ts++))
            echo -e "${RED}Missing TypeScript version:${NC} $js_file"
        fi
    done < <(find "$dir" -name "*.js")
done

echo -e "\n${GREEN}Summary:${NC}"
echo "Total JavaScript files: $total_js"
echo "Files missing TypeScript version: $missing_ts"
echo "Conversion progress: $(( (total_js - missing_ts) * 100 / total_js ))%"
