$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:3000/")
$listener.Start()
Write-Host "Server running at http://localhost:3000/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Fejlécek
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "*")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.OutputStream.Close()
            continue
        }

        $localPath = $request.Url.LocalPath.TrimStart('/')

        # 1. Beépített Backend Proxy végpont webshopok lekéréséhez (pl. Zara, H&M)
        if ($localPath.StartsWith("api/proxy")) {
            $targetUrl = $request.QueryString["url"]
            if (![string]::IsNullOrWhiteSpace($targetUrl)) {
                try {
                    $handler = New-Object System.Net.Http.HttpClientHandler
                    $handler.AllowAutoRedirect = $true
                    $client = New-Object System.Net.Http.HttpClient($handler)
                    $client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                    $client.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                    $client.DefaultRequestHeaders.Add("Accept-Language", "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7")

                    $task = $client.GetAsync($targetUrl)
                    $task.Wait()
                    $httpResult = $task.Result
                    
                    $contentTask = $httpResult.Content.ReadAsByteArrayAsync()
                    $contentTask.Wait()
                    $bytes = $contentTask.Result

                    $response.ContentType = $httpResult.Content.Headers.ContentType.ToString()
                    $response.ContentLength64 = $bytes.Length
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } catch {
                    $errMsg = [System.Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
                    $response.StatusCode = 500
                    $response.OutputStream.Write($errMsg, 0, $errMsg.Length)
                }
            } else {
                $response.StatusCode = 400
            }
            $response.OutputStream.Close()
            continue
        }

        # 2. Statikus fájlok kiszolgálása
        if ([string]::IsNullOrWhiteSpace($localPath)) {
            $localPath = "index.html"
        }

        $filePath = Join-Path (Get-Location) $localPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            
            if ($filePath.EndsWith(".html")) {
                $response.ContentType = "text/html; charset=utf-8"
            } elseif ($filePath.EndsWith(".js")) {
                $response.ContentType = "application/javascript"
            } elseif ($filePath.EndsWith(".css")) {
                $response.ContentType = "text/css"
            }

            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}
