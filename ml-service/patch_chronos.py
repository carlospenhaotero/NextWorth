import os
import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add typing imports if missing
    if 'from typing import' not in content:
        content = 'from typing import Union, Optional, List, Dict, Any\n' + content
    else:
        content = content.replace('from typing import', 'from typing import Union, Optional, List, Dict, Any,')

    # Simple regex to replace A | B with Union[A, B]
    # We handle multiple unions by applying recursively
    # This is a naive heuristic but should work for type hints
    
    # Matches: type | type
    # We use a loop to handle A | B | C -> Union[A, B] | C -> Union[Union[A, B], C]
    # Ideally should be right associative but Union is commutative
    
    pattern = r'([a-zA-Z0-9_\[\].\"]+(?:\[[^\]]+\])?)\s*\|\s*([a-zA-Z0-9_\[\].\"]+(?:\[[^\]]+\])?)'
    
    original_content = content
    for _ in range(5): # Repeat a few times for multiple unions
        content = re.sub(pattern, r'Union[\1, \2]', content)
    
    if content != original_content:
        print(f"Patched {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

def main():
    target_dir = os.path.join('venv', 'lib', 'site-packages', 'chronos')
    if not os.path.exists(target_dir):
        print(f"Directory not found: {target_dir}")
        return

    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith('.py'):
                patch_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
