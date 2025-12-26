import os
import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Handle explicit import from typing
    # Regex to matching "from typing import ... TypeAlias ..."
    # This is complex because of multi-line imports.
    # We will simple string replace "from typing import TypeAlias" -> "from typing_extensions import TypeAlias"
    # But often it is "from typing import List, TypeAlias"
    
    if 'TypeAlias' in content:
        # Check if it's imported from typing
        if 'from typing import ' in content and 'TypeAlias' in content:
            # Naive approach: Replace 'TypeAlias' in 'from typing import ...' with nothing, and add import at top
            # But 'TypeAlias' might be used in codes
            
            # Better: if 'from typing import' line contains TypeAlias, remove it from there?
            # Or just add `from typing_extensions import TypeAlias` AFTER imports, hoping it works? 
            # No, `from typing import TypeAlias` will raise ImportError before next line.
            
            # So I must remove it from `typing` import.
            
            # Simple hack: replace `TypeAlias` with `Any` in the import line? No.
            
            # Let's try to match import lines.
            lines = content.split('\n')
            new_lines = []
            patched_import = False
            for line in lines:
                if 'from typing import' in line and 'TypeAlias' in line:
                    # Remove TypeAlias from this line
                    # e.g. "from typing import List, TypeAlias" -> "from typing import List, "
                    # e.g. "from typing import TypeAlias" -> "from typing import " -> invalid?
                    
                    newline = line.replace(', TypeAlias', '').replace('TypeAlias, ', '').replace('TypeAlias', '')
                    if newline.strip() == 'from typing import':
                        newline = '' # Remove empty import
                    
                    new_lines.append(newline)
                    if not patched_import:
                        new_lines.append('from typing_extensions import TypeAlias')
                        patched_import = True
                else:
                    new_lines.append(line)
            
            content = '\n'.join(new_lines)

    if content != original_content:
        print(f"Patched {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

def main():
    target_dir = os.path.join('venv', 'lib', 'site-packages', 'chronos')
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith('.py'):
                patch_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
