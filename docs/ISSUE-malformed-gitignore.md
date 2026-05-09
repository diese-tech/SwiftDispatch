# Issue: malformed `.gitignore`

## Summary

Commit `402305d8149b2453e73aa3fc8d56ca9eb32918c3` introduced a broken `.gitignore`.
The file currently contains embedded NUL characters and a typo: `.DS_Stores`
instead of `.DS_Store`.

This makes the ignore file malformed, harder to review safely, and may allow
`.DS_Store` files to slip through.

## Minimal fix

Rewrite `C:\Projects\misc\SwiftDispatch\.gitignore` as plain text with only
these entries:

```gitignore
.next
node_modules
.env.local
.env
*.log
vercel
dist
build
.DS_Store
/supabase/.temp/
```

## Notes

- This is a repo hygiene fix only and should not affect runtime behavior or load
  testing.
- The current working tree already has the `.gitignore` repair applied locally
  but not committed; if another session handles this, it can either reuse that
  local edit or rewrite the file from scratch.

## Verification

1. Confirm `.gitignore` is plain text with no embedded NUL bytes.
2. Confirm the file includes `.DS_Store` and does not include `.DS_Stores`.
3. Run `git diff --text -- .gitignore` and verify the corrupted entry is
   replaced cleanly.
