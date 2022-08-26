
Write-Output "Install node dependencies"
npm install

Write-Output "Install NodeJs ws_secure_media_delivery layer dependencie for AWS Lambda"
Set-Location .\lambda\layers\aws_secure_media_delivery_nodejs\nodejs
npm install
Set-Location ..\..\..\..\

Write-Output "Install NodeJs ZipLocal layer dependencie for AWS Lambda"
Set-Location .\lambda\layers\ziplocal\nodejs
npm install
Set-Location ..\..\..\..\