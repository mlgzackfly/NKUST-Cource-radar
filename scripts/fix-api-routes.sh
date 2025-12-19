#!/bin/bash

# Fix API route type issues for Next.js 15

# List of files that need fixing
files=(
  "src/app/api/admin/trigger-scrape/route.ts"
  "src/app/api/courses/suggestions/route.ts"
  "src/app/api/reviews/route.ts"
  "src/app/api/search/suggestions/route.ts"
  "src/app/api/sync/courses/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."

    # Remove NextRequest from imports, keep only NextResponse
    sed -i '' 's/import { NextRequest, NextResponse }/import { NextResponse }/g' "$file"

    # Add Promise<Response> return type to async functions
    sed -i '' 's/export async function \([A-Z]*\)(request: Request)/export async function \1(request: Request): Promise<Response>/g' "$file"
    sed -i '' 's/export async function \([A-Z]*\)(/export async function \1(): Promise<Response>/g' "$file"

  fi
done

echo "Done! Please review the changes and build again."
