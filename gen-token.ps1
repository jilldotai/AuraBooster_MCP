$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$bytes = New-Object byte[] 20
$rng.GetBytes($bytes)
$token = [BitConverter]::ToString($bytes).Replace('-','').ToLower()
Write-Host $token
Set-Content -Path "token.tmp" -Value $token -NoNewline
