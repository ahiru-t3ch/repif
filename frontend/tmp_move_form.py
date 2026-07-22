from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text(encoding="utf-8")

error_start = text.find("          {error && (")
form_marker = '          <section\n            ref={formSectionRef}'
form_start = text.find(form_marker)
if error_start < 0 or form_start < 0:
    raise SystemExit(f"markers not found error={error_start} form={form_start}")

# Form section ends just before footer
footer_marker = '          <footer className="text-center text-xs text-muted">'
footer_start = text.find(footer_marker)
if footer_start < 0:
    raise SystemExit("footer not found")

# Block to move: error + form (from error_start to footer_start)
block = text[error_start:footer_start]

# Remove from current place
without = text[:error_start] + text[footer_start:]

# Insert after result IIFE closing `})()}` that precedes works section
anchor = "          })()}\n\n          {result && (\n            <section className=\"rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8\">\n              <FinanceSectionToggle\n                title={t(\"result.worksToggleTitle\")}"
idx = without.find(anchor)
if idx < 0:
    raise SystemExit("insert anchor not found")

# Insert block right before works section (after result)
insert_at = idx
# We want: result close, then error+form, then works
# The anchor starts with `})()}` - keep that, insert after the blank line following it
after_result = without.find("\n\n", idx)
# idx points to `          })()}` - find end of that line + following newlines
end_result_block = without.find("\n", idx)  # end of })()}
# skip one more blank line
while without[end_result_block:end_result_block+1] == "\n":
    end_result_block += 1
# end_result_block now at start of `{result && (` works
# go back to keep one blank line before works
# Actually: after `})()}\n\n` insert block then works

close = without.find("})()}", idx)
close_end = close + len("})()}")
# ensure we insert after })()}\n\n
if without[close_end:close_end+2] == "\n\n":
    insert_pos = close_end + 2
else:
    insert_pos = close_end + 1

new_text = without[:insert_pos] + block + "\n" + without[insert_pos:]
path.write_text(new_text, encoding="utf-8")
print("ok", "block_len", len(block), "insert_pos", insert_pos)
