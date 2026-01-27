# Complete Function Test
# 完整功能测试

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Antinet Complete Function Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000"
$testsPassed = 0
$testsFailed = 0

function Test-API {
    param(
        [string]$Name,
        [string]$Url,
        [string]$ExpectedContent = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host "  OK - Status: 200" -ForegroundColor Green
            
            if ($ExpectedContent) {
                if ($response.Content -like "*$ExpectedContent*") {
                    Write-Host "  OK - Content contains: $ExpectedContent" -ForegroundColor Green
                    $script:testsPassed++
                } else {
                    Write-Host "  FAIL - Content does not contain: $ExpectedContent" -ForegroundColor Red
                    $script:testsFailed++
                }
            } else {
                $script:testsPassed++
            }
        } else {
            Write-Host "  FAIL - Status: $($response.StatusCode)" -ForegroundColor Red
            $script:testsFailed++
        }
    } catch {
        Write-Host "  FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
    }
    
    Write-Host ""
}

# 测试 1：健康检查
Test-API -Name "Health Check" -Url "$baseUrl/api/health" -ExpectedContent "healthy"

# 测试 2：技能列表
Test-API -Name "Skill List" -Url "$baseUrl/api/skill/list" -ExpectedContent "knowledge_graph_visualization"

# 测试 3：技能分类
Test-API -Name "Skill Categories" -Url "$baseUrl/api/skill/categories"

# 测试 4：知识图谱
Test-API -Name "Knowledge Graph" -Url "$baseUrl/api/knowledge/graph" -ExpectedContent "nodes"

# 测试 5：API 文档
Test-API -Name "API Documentation" -Url "$baseUrl/docs"

# 测试 6：聊天 API
Write-Host "Testing: Chat API (POST)" -ForegroundColor Yellow
try {
    $body = @{
        query = "如何启动系统"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat/query" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing `
        -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "  OK - Chat API working" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "  FAIL - Chat API error: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# 总结
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host "Some tests failed. Please check the errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Install frontend dependencies: npm install echarts" -ForegroundColor White
Write-Host "  2. Start frontend: npm run dev" -ForegroundColor White
Write-Host "  3. Open browser: http://localhost:3000" -ForegroundColor White
Write-Host ""
