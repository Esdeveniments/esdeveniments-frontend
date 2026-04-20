#!/usr/bin/env python3
"""Parse webpack bundle analyzer HTML to extract module sizes."""
import json
import re
import sys

html_path = sys.argv[1] if len(sys.argv) > 1 else ".next/analyze/client.html"

with open(html_path, "r") as f:
    html = f.read()

# Extract the chartData JSON from the HTML
# Use greedy match since the JSON is very large
match = re.search(r"window\.chartData\s*=\s*(\[.*\]);\s*$", html, re.MULTILINE)
if not match:
    match = re.search(r"var\s+chartData\s*=\s*(\[.*\]);\s*$", html, re.MULTILINE)

if not match:
    print("Could not find chart data. Trying alternative pattern...")
    # Try to find JSON data embedded differently
    match = re.search(r'"children":\[', html)
    if match:
        print(f"Found children at position {match.start()}")
    print("First 500 chars of script tags:")
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
    for i, s in enumerate(scripts):
        if len(s) > 100:
            print(f"\n--- Script {i} ({len(s)} chars) ---")
            print(s[:500])
    sys.exit(1)

data = json.loads(match.group(1))

# Flatten the tree to find all leaf modules
modules = []

def walk(node, path=""):
    name = node.get("label", node.get("name", ""))
    current_path = f"{path}/{name}" if path else name
    if "groups" in node:
        for child in node["groups"]:
            walk(child, current_path)
    elif "children" in node:
        for child in node["children"]:
            walk(child, current_path)
    else:
        size = node.get("statSize", node.get("parsedSize", node.get("gzipSize", 0)))
        if size > 0:
            modules.append((size, current_path))

for chunk in data:
    walk(chunk)

modules.sort(reverse=True)
print("Top 30 modules by size:")
print("=" * 90)
for size, path in modules[:30]:
    kb = size / 1024
    print(f"{kb:8.1f} KB  {path}")

print()

# Group by top-level package
packages = {}
for size, path in modules:
    parts = path.split("/")
    pkg = "app-code"
    for i, part in enumerate(parts):
        if part == "node_modules":
            if i + 1 < len(parts):
                pkg_name = parts[i + 1]
                if pkg_name.startswith("@") and i + 2 < len(parts):
                    pkg_name = f"{parts[i + 1]}/{parts[i + 2]}"
                pkg = pkg_name
                break
    packages[pkg] = packages.get(pkg, 0) + size

pkg_list = sorted(packages.items(), key=lambda x: -x[1])
print("Top 20 packages by total size:")
print("=" * 90)
for pkg, size in pkg_list[:20]:
    kb = size / 1024
    print(f"{kb:8.1f} KB  {pkg}")

print()
print(f"Total modules: {len(modules)}")
print(f"Total size: {sum(s for s, _ in modules) / 1024 / 1024:.2f} MB")
