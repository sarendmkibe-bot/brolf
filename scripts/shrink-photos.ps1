Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$backup = Join-Path $root 'photo-originals'
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

function Shrink($folder, $maxWidth) {
  $saveTo = Join-Path $backup (Split-Path $folder -Leaf)
  New-Item -ItemType Directory -Force -Path $saveTo | Out-Null

  Get-ChildItem (Join-Path $folder '*') -Include *.jpg, *.jpeg, *.jfif -File | ForEach-Object {
    $item = $_
    if ($item.Length -lt 300KB) { return }   # already small enough

    $file = $item.FullName
    $name = $item.Name
    $before = $item.Length
    $tmp = "$file.tmp"

    try {
      Copy-Item $file (Join-Path $saveTo $name) -Force   # keep the original

      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ms = New-Object System.IO.MemoryStream(, $bytes)
      $img = [System.Drawing.Image]::FromStream($ms)

      if ($img.Width -gt $maxWidth) {
        $w = $maxWidth
        $h = [int]($img.Height * $maxWidth / $img.Width)
      } else {
        $w = $img.Width
        $h = $img.Height
      }

      $bmp = New-Object System.Drawing.Bitmap($w, $h)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($img, 0, 0, $w, $h)
      $g.Dispose()

      $bmp.Save($tmp, $codec, $params)
      $bmp.Dispose()
      $img.Dispose()
      $ms.Dispose()

      # Overwrite the original with the small version, then remove the temp file
      [System.IO.File]::Copy($tmp, $file, $true)
      Remove-Item $tmp -Force

      $after = (Get-Item $file).Length
      '{0}: {1} KB -> {2} KB' -f $name, [int]($before / 1KB), [int]($after / 1KB)
    }
    catch {
      Write-Host ('FAILED {0}: {1}' -f $name, $_.Exception.Message) -ForegroundColor Red
      if (Test-Path $tmp) { Remove-Item $tmp -Force }
    }
  }
}

Shrink (Join-Path $root 'client\public\products') 800
Shrink (Join-Path $root 'client\public\images') 1600