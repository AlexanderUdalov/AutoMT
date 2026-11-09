$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $projectRoot 'Sources/Backend/AutoMT.csproj'
$runtime9 = dotnet --list-runtimes | Select-String '^Microsoft.AspNetCore.App 9\.'
if ([Environment]::OSVersion.Platform -eq 'Win32NT' -and -not $runtime9) {
    $arch = [Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
    dotnet run --project $project '-p:SelfContained=true' "-p:RuntimeIdentifier=win-$arch" @args
} else {
    dotnet run --project $project @args
}
exit $LASTEXITCODE
