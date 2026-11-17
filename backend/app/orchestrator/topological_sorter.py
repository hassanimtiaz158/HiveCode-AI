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


def sort_files_topologically(files: List[FileAction]) -> List[FileAction]:
    """
    Orders FileActions so dependencies are built before the files that import them.
    Guarantees that data/site.json is always first.
    If a circular dependency occurs, falls back gracefully to architectural role priority.
    """
    if not files:
        return []

    # Map file path to FileAction
    action_map = {f.path: f for f in files}
    in_degree = {f.path: 0 for f in files}
    adjacency = defaultdict(list)

    # Build dependency graph
    for file in files:
        for imp in file.imports:
            # Normalize import path to relative file path match
            matched_dep = None
            for candidate in action_map:
                if candidate in imp or imp in candidate:
                    matched_dep = candidate
                    break
            if matched_dep and matched_dep != file.path:
                adjacency[matched_dep].append(file.path)
                in_degree[file.path] += 1

    # Kahn's algorithm
    queue = deque([path for path, deg in in_degree.items() if deg == 0])
    # Sort queue by role priority so content (site.json) starts first
    queue = deque(sorted(queue, key=lambda p: ROLE_PRIORITY.get(action_map[p].role, 99)))

    sorted_paths = []
    while queue:
        curr = queue.popleft()
        sorted_paths.append(curr)
        for neighbor in adjacency[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # If circular dependencies were detected, append any remaining files by role priority
    if len(sorted_paths) < len(files):
        remaining = [f.path for f in files if f.path not in sorted_paths]
        remaining.sort(key=lambda p: ROLE_PRIORITY.get(action_map[p].role, 99))
        sorted_paths.extend(remaining)

    # Ensure data/site.json is strictly at index 0 if present
    if "data/site.json" in sorted_paths:
        sorted_paths.remove("data/site.json")
        sorted_paths.insert(0, "data/site.json")

    return [action_map[p] for p in sorted_paths]