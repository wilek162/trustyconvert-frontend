#!/bin/bash

echo "Troubleshooting file structure issues..."

# Check critical components
if [ -f src/components/features/conversion/ConversionFlow.tsx ]; then
  echo "✅ ConversionFlow.tsx exists"
else
  echo "❌ ConversionFlow.tsx missing!"
fi

if [ -f src/components/features/session/CloseSession.tsx ]; then
  echo "✅ CloseSession.tsx exists"
else
  echo "❌ CloseSession.tsx missing!"
  # Try to recreate if missing
  cp -f src/components/CloseSession.tsx src/components/features/session/ 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "  ↳ Recovered CloseSession.tsx"
  fi
fi

if [ -f src/components/features/session/SessionManager.tsx ]; then
  echo "✅ SessionManager.tsx exists"
else
  echo "❌ SessionManager.tsx missing!"
  # Try to recreate if missing
  cp -f src/components/features/SessionManager.tsx src/components/features/session/ 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "  ↳ Recovered SessionManager.tsx"
  fi
fi

if [ -f src/lib/config/constants.ts ]; then
  echo "✅ constants.ts exists"
else
  echo "❌ constants.ts missing!"
fi

# Check index files
if [ -f src/components/features/conversion/index.ts ]; then
  echo "✅ conversion/index.ts exists"
else
  echo "❌ conversion/index.ts missing!"
  echo "  ↳ Creating index.ts"
  echo 'export { default as ConversionFlow } from "./ConversionFlow"' > src/components/features/conversion/index.ts
  echo 'export { default as FormatSelector } from "./FormatSelector"' >> src/components/features/conversion/index.ts
fi

if [ -f src/components/features/session/index.ts ]; then
  echo "✅ session/index.ts exists"
else
  echo "❌ session/index.ts missing!"
  echo "  ↳ Creating index.ts"
  echo 'export { default as SessionManager } from "./SessionManager"' > src/components/features/session/index.ts
  echo 'export { default as CloseSession } from "./CloseSession"' >> src/components/features/session/index.ts
fi

echo "Troubleshooting complete!" 