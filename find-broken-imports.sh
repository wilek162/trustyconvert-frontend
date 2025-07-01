#!/bin/bash

echo "Checking for potentially broken imports..."

# Check for ConversionStats imports in the codebase
echo "Checking for ConversionStats imports:"
grep -r --include="*.tsx" --include="*.ts" "ConversionStats" src/

# Check for UploadZone imports in the codebase
echo -e "\nChecking for UploadZone imports:"
grep -r --include="*.tsx" --include="*.ts" "UploadZone" src/

# Check for FormatSelector imports in the codebase
echo -e "\nChecking for FormatSelector imports:"
grep -r --include="*.tsx" --include="*.ts" "FormatSelector" src/

# Check for SessionManager imports in the codebase
echo -e "\nChecking for SessionManager imports:"
grep -r --include="*.tsx" --include="*.ts" "SessionManager" src/

# Check for CloseSession imports in the codebase
echo -e "\nChecking for CloseSession imports:"
grep -r --include="*.tsx" --include="*.ts" "CloseSession" src/

echo -e "\nImport check complete!" 