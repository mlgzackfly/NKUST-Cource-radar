#!/bin/bash
# Fix Response types for Phase 1 API routes

files=(
  "src/app/api/favorites/route.ts"
  "src/app/api/favorites/[id]/route.ts"
  "src/app/api/comments/[id]/route.ts"
  "src/app/api/courses/[id]/favorite-status/route.ts"
  "src/app/api/reviews/[id]/comments/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Only replace return NextResponse.json( with cast, not other statements
    perl -i -pe 's/(^\s*return\s+NextResponse\.json\([^;]+\));/$1 as Response;/g' "$file"
    echo "Fixed: $file"
  fi
done
