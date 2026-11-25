$root = Split-Path $PSScriptRoot -Parent
$tracks = [Collections.Generic.List[object]]::new()
foreach ($file in (Get-ChildItem (Join-Path $root 'public/gpx') -Filter 'day-*.gpx' | Sort-Object Name)) {
  [xml]$gpx = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  $points = [Collections.Generic.List[object]]::new()
  foreach ($point in $gpx.SelectNodes("//*[local-name()='trkseg']/*[local-name()='trkpt']")) {
    $elevation = if ($point.ele) { [double]$point.ele } else { $null }
    $points.Add(@([double]$point.lat, [double]$point.lon, $elevation))
  }
  if ($points.Count -lt 2) { throw "Missing track points in $($file.Name)" }
  $tracks.Add($points.ToArray())
}
if ($tracks.Count -ne 4) { throw 'Expected four GPX files' }
$json = ConvertTo-Json -InputObject $tracks.ToArray() -Depth 4 -Compress
[IO.File]::WriteAllText((Join-Path $root 'public/tracks.js'), "export default $json`n", [Text.UTF8Encoding]::new($false))
