import os

with open('src/renderer/src/App.tsx', 'r') as f:
    lines = f.readlines()

def find_component_range(name, lines):
    start = None
    for i, line in enumerate(lines):
        if f'function {name}(' in line or f'function {name} ' in line:
            start = i
            break
    if start is None:
        return None
    depth = 0
    started = False
    for i in range(start, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1
                started = True
            elif ch == '}':
                depth -= 1
        if started and depth == 0:
            return (start, i)
    return None

extras = {
    'ProxySettingsTab': 'src/renderer/src/panels/ProxySettingsTab.tsx',
    'CustomTooltip': None,
    'FingerprintSettingsTab': None,
    'CookieSettingsTab': None,
}

for name, path in extras.items():
    r = find_component_range(name, lines)
    if r:
        start, end = r
        code = ''.join(lines[start:end+1])
        if path:
            with open(path, 'w') as f:
                f.write(code)
            print(f'OK: {path} lines {start+1}-{end+1}')
        else:
            print(f'FOUND: {name} lines {start+1}-{end+1} ({len(code)} chars)')
    else:
        print(f'NOT FOUND: {name}')
