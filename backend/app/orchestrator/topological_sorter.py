from collections import defaultdict, deque
from typing import List
from contracts.plan import FileAction


ROLE_PRIORITY = {
    "content": 0,    # data/site.json first
    "config": 1,     # tailwind, vite config
    "style": 2,      # index.css
    "component": 3,  # Navbar, Hero, ProductGrid
    "page": 4,       # App.tsx
    "api": 5,
}


def is_import_match(import_str: str, candidate_path: str) -> bool:
    """
    Checks if a JavaScript/TypeScript import statement matches a project file path.
    Handles relative paths ('./components/Navbar', '../data/site.json') and extensions.
    """
    imp = import_str.replace("\\", "/").strip()
    cand = candidate_path.replace("\\", "/").strip()

    # Strip leading relative prefixes (./ or ../ or /)
    while imp.startswith(("./", "../", "/")):
        if imp.startswith("./"):
            imp = imp[2:]
        elif imp.startswith("../"):
            imp = imp[3:]
        elif imp.startswith("/"):
            imp = imp[1:]

    # Strip standard file extensions
    for ext in (".tsx", ".ts", ".jsx", ".js", ".json"):
        if cand.endswith(ext):
            cand = cand[:-len(ext)]
        if imp.endswith(ext):
            imp = imp[:-len(ext)]

    # Match if cleaned paths are identical or if candidate ends with the import subpath
    return imp == cand or cand.endswith("/" + imp) or cand.endswith(imp)


def sort_files_topologically(files: List[FileAction]) -> List[FileAction]:
    """
    Orders FileActions so dependencies are built before the files that import them.
    Guarantees that data/site.json is always first and components precede App.tsx.
    """
    if not files:
        return []

    action_map = {f.path: f for f in files}
    in_degree = {f.path: 0 for f in files}
    adjacency = defaultdict(list)

    # Build dependency graph
    for file in files:
        for imp in file.imports:
            matched_dep = None
            for candidate in action_map:
                if is_import_match(imp, candidate):
                    matched_dep = candidate
                    break
            if matched_dep and matched_dep != file.path:
                adjacency[matched_dep].append(file.path)
                in_degree[file.path] += 1

    # Start with nodes that have in_degree == 0, sorted by role priority
    ready = [path for path, deg in in_degree.items() if deg == 0]
    ready.sort(key=lambda p: ROLE_PRIORITY.get(action_map[p].role, 99))
    queue = deque(ready)

    sorted_paths = []
    while queue:
        curr = queue.popleft()
        sorted_paths.append(curr)

        new_ready = []
        for neighbor in adjacency[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                new_ready.append(neighbor)

        # Ensure freshly ready nodes are added in role priority order (components before pages)
        new_ready.sort(key=lambda p: ROLE_PRIORITY.get(action_map[p].role, 99))
        queue.extend(new_ready)

    # If circular dependencies were detected, append any remaining files by role priority
    if len(sorted_paths) < len(files):
        remaining = [f.path for f in files if f.path not in sorted_paths]
        remaining.sort(key=lambda p: ROLE_PRIORITY.get(action_map[p].role, 99))
        sorted_paths.extend(remaining)

    # Inviolable rule: data/site.json is strictly at index 0 if present
    if "data/site.json" in sorted_paths:
        sorted_paths.remove("data/site.json")
        sorted_paths.insert(0, "data/site.json")

    return [action_map[p] for p in sorted_paths]