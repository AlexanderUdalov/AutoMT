"""Talk to a forced-command SSH release receiver; no remote shell commands."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['status','verify','deploy','rollback'])
    parser.add_argument('--archive',type=Path)
    parser.add_argument('--sha')
    parser.add_argument('--backup')
    args=parser.parse_args()
    names=('DEPLOY_HOST','DEPLOY_USER','DEPLOY_KNOWN_HOSTS')
    if any(not os.environ.get(n) for n in names):
        parser.error('Set '+', '.join(names))
    if not (os.environ.get('DEPLOY_SSH_KEY_FILE') or os.environ.get('DEPLOY_SSH_KEY')):
        parser.error('Set DEPLOY_SSH_KEY (CI) or DEPLOY_SSH_KEY_FILE (local SSH identity)')
    host,user=os.environ['DEPLOY_HOST'],os.environ['DEPLOY_USER']
    if not re.fullmatch(r'[A-Za-z0-9.:-]+',host) or not re.fullmatch(r'[a-z][a-z0-9-]*',user):
        parser.error('Invalid SSH destination')
    port=int(os.environ.get('DEPLOY_PORT','22'))
    alias=os.environ.get('DEPLOY_HOST_KEY_ALIAS','portfolio-primary')
    if not 1<=port<=65535 or not re.fullmatch(r'[a-zA-Z0-9_-]+',alias):
        parser.error('Invalid port or host key alias')
    header={'action':args.action}
    if args.action in ('verify','deploy'):
        if not args.archive or not args.sha or not re.fullmatch(r'[0-9a-f]{40}',args.sha):
            parser.error('--archive and exact --sha are required')
        header.update(sha=args.sha,archive_sha256=hashlib.sha256(args.archive.read_bytes()).hexdigest())
    if args.action=='rollback':
        if not args.backup or not re.fullmatch(r'[A-Za-z0-9_-]+',args.backup):
            parser.error('--backup is required')
        header['backup']=args.backup
    with tempfile.TemporaryDirectory() as folder:
        root=Path(folder); hosts=root/'known_hosts'; request=root/'request'
        key=Path(os.environ['DEPLOY_SSH_KEY_FILE']) if os.environ.get('DEPLOY_SSH_KEY_FILE') else root/'key'
        if not os.environ.get('DEPLOY_SSH_KEY_FILE'):
            key.write_text(os.environ['DEPLOY_SSH_KEY'].strip()+'\n',encoding='utf-8',newline='\n'); key.chmod(0o600)
        hosts.write_text(os.environ['DEPLOY_KNOWN_HOSTS'].strip()+'\n',encoding='utf-8',newline='\n')
        with request.open('wb') as stream:
            stream.write(json.dumps(header).encode()+b'\n')
            if args.archive:
                with args.archive.open('rb') as source: shutil.copyfileobj(source,stream)
        command=[shutil.which('ssh') or 'ssh','-T','-p',str(port),'-i',str(key),'-o','IdentitiesOnly=yes',
                 '-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','HostKeyAlias='+alias,
                 '-o','UserKnownHostsFile='+str(hosts),'-o','ConnectTimeout=15',
                 '-o','ServerAliveInterval=20','-o','ServerAliveCountMax=3',user+'@'+host]
        with request.open('rb') as stream:
            result=subprocess.run(command,stdin=stream,capture_output=True,timeout=1800)
        if result.returncode:
            # Receiver errors contain only stage names, never runtime env or subprocess logs.
            print(result.stdout.decode(errors='replace')[-2000:])
            diagnostic=result.stderr.decode(errors='replace')
            if os.environ.get('DEPLOY_SSH_KEY'): diagnostic=diagnostic.replace(os.environ['DEPLOY_SSH_KEY'],'[key redacted]')
            print(diagnostic[-2000:],file=sys.stderr)
            raise SystemExit('Release receiver failed (SSH diagnostics suppressed; verify target/key/fingerprint)')
        response=json.loads(result.stdout)
        print(json.dumps(response,ensure_ascii=False))
        if not response.get('ok'): raise SystemExit(1)

if __name__=='__main__': main()
