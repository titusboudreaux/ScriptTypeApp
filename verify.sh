#!/bin/bash
# Bible Type - Project Verification Checklist
# Run this to verify all project files are in place

echo "🔍 Bible Type Project Verification"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
total=0
passed=0

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    ((total++))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((passed++))
    else
        echo -e "${RED}✗${NC} $description (missing: $file)"
    fi
}

# Function to check directory exists
check_dir() {
    local dir=$1
    local description=$2
    ((total++))
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((passed++))
    else
        echo -e "${RED}✗${NC} $description (missing: $dir)"
    fi
}

# Check root files
echo "📄 Root Files"
check_file "index.html" "Main HTML file"
check_file "README.md" "User documentation"
check_file "QUICKSTART.md" "Quick start guide"
check_file "DATA_STRUCTURE.md" "Data format reference"
check_file "DEVELOPER_GUIDE.md" "Developer guide"
check_file "PROJECT_SUMMARY.md" "Project summary"
check_file ".gitignore" "Git ignore file"
echo ""

# Check directories
echo "📁 Directories"
check_dir "css" "CSS directory"
check_dir "js" "JavaScript directory"
check_dir "data" "Data directory"
check_dir "scripts" "Scripts directory"
check_dir ".github" "GitHub directory"
echo ""

# Check CSS files
echo "🎨 CSS Files"
check_file "css/styles.css" "Main stylesheet"
echo ""

# Check JavaScript files
echo "⚙️  JavaScript Files"
check_file "js/app.js" "Main app file"
check_file "js/data-loader.js" "Data loader module"
check_file "js/storage-manager.js" "Storage manager module"
check_file "js/typing-engine.js" "Typing engine module"
check_file "js/ui-manager.js" "UI manager module"
echo ""

# Check data files
echo "📖 Data Files"
check_file "data/genesis/1.json" "Sample Genesis 1 data"
echo ""

# Check script files
echo "🔧 Script Files"
check_file "scripts/generate_data.py" "Data generation script"
echo ""

# Check GitHub files
echo "🐙 GitHub Files"
check_file ".github/copilot-instructions.md" "Copilot instructions"
echo ""

# Summary
echo "=================================="
echo "Verification Results: $passed/$total passed"
echo ""

if [ $passed -eq $total ]; then
    echo -e "${GREEN}✓ All project files are in place!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start a local server (python -m http.server 8000)"
    echo "2. Open http://localhost:8000 in your browser"
    echo "3. Add more Bible data files"
    echo "4. Test the app!"
    exit 0
else
    echo -e "${RED}✗ Some files are missing!${NC}"
    echo "Please check the items marked above."
    exit 1
fi
