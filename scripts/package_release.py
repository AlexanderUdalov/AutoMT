"""Create a code-only release; no env files, databases or user uploads."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import tarfile

FORBIDDEN = {'data','database','uploads','backups','private','.venv','__pycache__','.git','node_modules'}

def safe_name(name):
    parts = Path(name).parts
    leaf = parts[-1] if parts else ''
    return (bool(parts) and not any(p in FORBIDDEN or p.startswith('.') for p in parts)
            and not leaf.startswith(('appsettings', 'storage-report'))
            and not re.search(r'\.(db|sqlite|sqlite3)(-|$)|\.(pem|key|pyc|log)$', leaf)
            and leaf not in {'runtime.env','ACCESS.txt','prototype.html'})

def package(project, sha, folders, output):
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Release must reference an exact Git commit')
    files = {}
    for prefix, folder in folders.items():
        for source in sorted(Path(folder).rglob('*')):
            if source.is_symlink():
                raise ValueError('Symlinks are not allowed in releases')
            if not source.is_file():
                continue
            name = prefix + '/' + source.relative_to(folder).as_posix()
            if safe_name(name):
                files[name] = source
    manifest = {'project':project,'sha':sha,'files':{name:hashlib.sha256(p.read_bytes()).hexdigest() for name,p in files.items()}}
    output = Path(output)
    output.parent.mkdir(parents=True,exist_ok=True)
    with tarfile.open(output,'w:gz') as archive:
        blob = json.dumps(manifest,sort_keys=True).encode()
        info = tarfile.TarInfo('release.json'); info.size = len(blob); info.mode = 0o600
        archive.addfile(info,io.BytesIO(blob))
        for name,source in files.items():
            archive.add(source,arcname=name,recursive=False)
    print(json.dumps({'project':project,'sha':sha,'files':len(files),'archive':str(output)}))

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project',required=True)
    parser.add_argument('--sha',required=True)
    parser.add_argument('--backend',required=True,type=Path)
    parser.add_argument('--frontend',required=True,type=Path)
    parser.add_argument('--output',default='release.tar.gz')
    args=parser.parse_args()
    package(args.project,args.sha,{'backend':args.backend,'frontend':args.frontend},args.output)
