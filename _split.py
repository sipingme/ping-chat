import re, os

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

components = {
    'TitleBar': 'src/renderer/src/components/TitleBar.tsx',
    'PlatformSidebar': 'src/renderer/src/components/PlatformSidebar.tsx',
    'SessionCard': None,
    'ConversationSidebar': 'src/renderer/src/components/ConversationSidebar.tsx',
    'MainPanel': 'src/renderer/src/components/MainPanel.tsx',
    'MonitorPanel': None,
    'AutoReplyPanel': 'src/renderer/src/panels/AutoReplyPanel.tsx',
    'ProxyEnvironmentPanel': 'src/renderer/src/panels/ProxyEnvironmentPanel.tsx',
    'RightToolBar': 'src/renderer/src/components/RightToolBar.tsx',
}

for name, path in components.items():
    if path is None:
        continue
    r = find_component_range(name, lines)
    if r:
        start, end = r
        code = ''.join(lines[start:end+1])
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            f.write(code)
        print(f'OK: {path} lines {start+1}-{end+1} ({len(code)} chars)')
    else:
        print(f'FAIL: {name}')
