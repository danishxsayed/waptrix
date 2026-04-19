for file in "$@"; do
  if grep -q "export const dynamic = 'force-dynamic'" "$file"; then
    echo "Skipping $file (already has dynamic export)"
    continue
  fi
  if head -n 1 "$file" | grep -q "\"use client\""; then
    # Insert after line 1
    sed -i '' '2i\
export const dynamic = "force-dynamic";\
' "$file"
  elif head -n 1 "$file" | grep -q "'use client'"; then
    # Insert after line 1
    sed -i '' '2i\
export const dynamic = "force-dynamic";\
' "$file"
  else
    # Insert at line 1
    sed -i '' '1i\
export const dynamic = "force-dynamic";\
' "$file"
  fi
  echo "Fixed $file"
done
