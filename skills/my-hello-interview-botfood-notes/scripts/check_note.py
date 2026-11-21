#!/usr/bin/env python3
"""Check Markdown fences that commonly prevent Obsidian diagrams rendering."""

import re
import sys
from pathlib import Path


def check(path):
    lines = path.read_text().splitlines()
    opening = None
    body = []
    errors = []
    diagrams = 0
    diagram_start = re.compile(
        r"^(flowchart\s|graph\s|sequenceDiagram\b|classDiagram\b|"
        r"stateDiagram|erDiagram\b|gantt\b|pie\b|mindmap\b|timeline\b)"
    )
    for number, line in enumerate(lines, 1):
        fence = re.match(r"^\s*(`{3,}|~{3,})(.*)$", line)
        if opening is None:
            if fence:
                marker, info = fence.groups()
                opening = (number, marker, info.strip())
                body = []
            elif diagram_start.match(line.strip()):
                errors.append(f"{number}: diagram source outside a Mermaid fence")
            continue
        start, marker, info = opening
        closes = (
            fence
            and fence[1][0] == marker[0]
            and len(fence[1]) >= len(marker)
            and not fence[2].strip()
        )
        if closes:
            content = "\n".join(body)
            if re.search(r"^\s*```mermaid\s*$", content, re.M):
                errors.append(f"{start}: Mermaid block hidden inside an outer code fence")
            if info == "mermaid":
                diagrams += 1
                if marker != "```":
                    errors.append(f"{start}: use a three-backtick Mermaid fence")
                if not content.strip():
                    errors.append(f"{start}: empty Mermaid diagram")
            elif any(diagram_start.match(item.strip()) for item in body):
                errors.append(f"{start}: diagram code block needs the mermaid language label")
            opening = None
            body = []
        else:
            body.append(line)
    if opening:
        errors.append(f"{opening[0]}: unclosed code fence")
    return diagrams, errors


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: check_note.py NOTE.md")
    note = Path(sys.argv[1])
    count, problems = check(note)
    if problems:
        print("\n".join(problems))
        raise SystemExit(1)
    print(f"PASS: {count} Mermaid blocks; fences valid. Visual rendering not checked.")
