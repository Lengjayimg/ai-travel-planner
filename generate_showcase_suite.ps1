Add-Type -AssemblyName System.Drawing

# Ensure standard UTF-8 console output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Export-ShowcaseCard {
    param(
        [string]$ScreenshotPath,
        [string]$OutputPath,
        [string]$CategoryBadge,
        [string]$Title,
        [string]$Subtitle,
        [string[]]$FeaturePills,
        [string]$AccentHex = "#5A7E64"
    )

    $width = 1600
    $height = 1000
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    # Background gradient
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($width, $height)),
        [System.Drawing.ColorTranslator]::FromHtml("#FAFBF8"),
        [System.Drawing.ColorTranslator]::FromHtml("#EFF2EB")
    )
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)
    $bgBrush.Dispose()

    # Subtle ambient glow
    $glowColor = [System.Drawing.Color]::FromArgb(40, 90, 126, 100)
    $glowBrush = New-Object System.Drawing.SolidBrush($glowColor)
    $g.FillEllipse($glowBrush, -80, -80, 650, 650)
    $glowBrush.Dispose()

    # Fonts
    $fontBrand = New-Object System.Drawing.Font("Inter", 12, [System.Drawing.FontStyle]::Bold)
    $fontBadge = New-Object System.Drawing.Font("Inter", 11, [System.Drawing.FontStyle]::Bold)
    $fontTitle = New-Object System.Drawing.Font("Inter", 36, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Inter", 17, [System.Drawing.FontStyle]::Regular)
    $fontPill = New-Object System.Drawing.Font("Inter", 13, [System.Drawing.FontStyle]::Bold)

    $textMain = [System.Drawing.ColorTranslator]::FromHtml("#1C261F")
    $textMuted = [System.Drawing.ColorTranslator]::FromHtml("#4E5E52")
    $primaryColor = [System.Drawing.ColorTranslator]::FromHtml($AccentHex)

    $brushTextMain = New-Object System.Drawing.SolidBrush($textMain)
    $brushTextMuted = New-Object System.Drawing.SolidBrush($textMuted)
    $brushPrimary = New-Object System.Drawing.SolidBrush($primaryColor)

    # Left Section
    $leftX = 100
    $curY = 100

    # Top Brand Pill
    $brandBox = New-Object System.Drawing.Rectangle($leftX, $curY, 215, 38)
    $brandBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 90, 126, 100))
    $pathBrand = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pathBrand.AddArc($brandBox.X, $brandBox.Y, 38, 38, 90, 180)
    $pathBrand.AddArc($brandBox.Right - 38, $brandBox.Y, 38, 38, 270, 180)
    $pathBrand.CloseFigure()
    $g.FillPath($brandBg, $pathBrand)
    $brandBg.Dispose()
    $pathBrand.Dispose()

    $g.DrawString("WAYFIND AI PLANNER", $fontBadge, $brushPrimary, ($leftX + 18), ($curY + 11))
    $curY += 68

    # Category Tag
    $g.DrawString($CategoryBadge.ToUpper(), $fontBrand, $brushPrimary, $leftX, $curY)
    $curY += 34

    # Main Title
    $g.DrawString($Title, $fontTitle, $brushTextMain, (New-Object System.Drawing.RectangleF($leftX, $curY, 700, 160)))
    $curY += 155

    # Subtitle
    $g.DrawString($Subtitle, $fontSub, $brushTextMuted, (New-Object System.Drawing.RectangleF($leftX, $curY, 680, 120)))
    $curY += 125

    # Feature Pills with Sleek Vector Bullet Dots
    $pillY = $curY
    foreach ($pillText in $FeaturePills) {
        $pillSize = $g.MeasureString($pillText, $fontPill)
        $pillW = [int]($pillSize.Width + 60)
        $pillH = 46
        $pillRect = New-Object System.Drawing.Rectangle($leftX, $pillY, $pillW, $pillH)

        $pillPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $pillPath.AddArc($pillRect.X, $pillRect.Y, $pillH, $pillH, 90, 180)
        $pillPath.AddArc($pillRect.Right - $pillH, $pillRect.Y, $pillH, $pillH, 270, 180)
        $pillPath.CloseFigure()

        $pillBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillPath($pillBg, $pillPath)
        $pillBg.Dispose()

        $pillPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(45, 90, 126, 100), 1.5)
        $g.DrawPath($pillPen, $pillPath)
        $pillPen.Dispose()
        $pillPath.Dispose()

        # Elegant Vector Bullet Dot (Olive Accent)
        $dotBrush = New-Object System.Drawing.SolidBrush($primaryColor)
        $g.FillEllipse($dotBrush, ($leftX + 20), ($pillY + 18), 10, 10)
        $dotBrush.Dispose()

        $g.DrawString($pillText, $fontPill, $brushTextMain, ($leftX + 40), ($pillY + 13))
        $pillY += 62
    }

    # Right Section: Device Mockup
    if (Test-Path $ScreenshotPath) {
        $screenImg = [System.Drawing.Image]::FromFile($ScreenshotPath)

        $targetW = 430
        $targetH = 880
        $devX = 890
        $devY = 60

        # Realistic Soft Drop Shadow
        for ($i = 16; $i -ge 1; $i--) {
            $shadowAlpha = [int](3.2 * (17 - $i))
            $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($shadowAlpha, 20, 32, 24))
            $sRect = New-Object System.Drawing.Rectangle(($devX - $i), ($devY - $i + 14), ($targetW + $i * 2), ($targetH + $i * 2))
            $sPath = New-Object System.Drawing.Drawing2D.GraphicsPath
            $r = 50 + $i
            $sPath.AddArc($sRect.X, $sRect.Y, $r, $r, 180, 90)
            $sPath.AddArc($sRect.Right - $r, $sRect.Y, $r, $r, 270, 90)
            $sPath.AddArc($sRect.Right - $r, $sRect.Bottom - $r, $r, $r, 0, 90)
            $sPath.AddArc($sRect.X, $sRect.Bottom - $r, $r, $r, 90, 90)
            $sPath.CloseFigure()
            $g.FillPath($shadowBrush, $sPath)
            $shadowBrush.Dispose()
            $sPath.Dispose()
        }

        # Device Body Frame
        $frameRect = New-Object System.Drawing.Rectangle($devX, $devY, $targetW, $targetH)
        $framePath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $rad = 48
        $framePath.AddArc($frameRect.X, $frameRect.Y, $rad, $rad, 180, 90)
        $framePath.AddArc($frameRect.Right - $rad, $frameRect.Y, $rad, $rad, 270, 90)
        $framePath.AddArc($frameRect.Right - $rad, $frameRect.Bottom - $rad, $rad, $rad, 0, 90)
        $framePath.AddArc($frameRect.X, $frameRect.Bottom - $rad, $rad, $rad, 90, 90)
        $framePath.CloseFigure()

        $frameBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#181F1A"))
        $g.FillPath($frameBrush, $framePath)
        $frameBrush.Dispose()

        $framePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#38483C"), 2.5)
        $g.DrawPath($framePen, $framePath)
        $framePen.Dispose()

        # Inner Screen Display Area
        $borderInset = 12
        $screenRect = New-Object System.Drawing.Rectangle(($devX + $borderInset), ($devY + $borderInset), ($targetW - $borderInset * 2), ($targetH - $borderInset * 2))
        
        $screenPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $radInner = 38
        $screenPath.AddArc($screenRect.X, $screenRect.Y, $radInner, $radInner, 180, 90)
        $screenPath.AddArc($screenRect.Right - $radInner, $screenRect.Y, $radInner, $radInner, 270, 90)
        $screenPath.AddArc($screenRect.Right - $radInner, $screenRect.Bottom - $radInner, $radInner, $radInner, 0, 90)
        $screenPath.AddArc($screenRect.X, $screenRect.Bottom - $radInner, $radInner, $radInner, 90, 90)
        $screenPath.CloseFigure()

        $g.SetClip($screenPath)
        $g.DrawImage($screenImg, $screenRect.X, $screenRect.Y, $screenRect.Width, $screenRect.Height)
        $g.ResetClip()

        $screenImg.Dispose()
        $framePath.Dispose()
        $screenPath.Dispose()
    }

    # Clean up fonts & brushes
    $brushTextMain.Dispose()
    $brushTextMuted.Dispose()
    $brushPrimary.Dispose()
    $fontBrand.Dispose()
    $fontBadge.Dispose()
    $fontTitle.Dispose()
    $fontSub.Dispose()
    $fontPill.Dispose()

    # Save as high-quality JPEG
    $jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]93)

    $bmp.Save($OutputPath, $jpegEncoder, $encoderParams)
    $g.Dispose()
    $bmp.Dispose()
}

function Convert-ToJpeg {
    param(
        [string]$PngPath,
        [string]$JpegPath,
        [int]$Quality = 92
    )

    if (Test-Path $PngPath) {
        $img = [System.Drawing.Image]::FromFile($PngPath)
        $jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
        $img.Save($JpegPath, $jpegEncoder, $encoderParams)
        $img.Dispose()
    }
}

# --- GENERATE THE 4 SHOWCASE PRESENTATION JPEGS ---
Export-ShowcaseCard `
    -ScreenshotPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\4 Home Dashboard.png" `
    -OutputPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\showcase_1_ai_travel_dashboard.jpg" `
    -CategoryBadge "Smart Discovery & Overview" `
    -Title "AI-Powered Travel Dashboard" `
    -Subtitle "Personalized destination recommendations, instant trip planning, and recent journey overviews tailored to you." `
    -FeaturePills @("Instant AI Trip Generation", "Trending Curated Destinations", "Real-Time Saved Trips Sync")

Export-ShowcaseCard `
    -ScreenshotPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\5 Trip Input.png" `
    -OutputPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\showcase_2_trip_planning_wizard.jpg" `
    -CategoryBadge "Custom Itinerary Builder" `
    -Title "Personalized Planning Wizard" `
    -Subtitle "Tailor your journey with flexible travel dates, smart budget ranges, group companions, and curated travel mood chips." `
    -FeaturePills @("Dynamic Date Range Calendar", "Multi-Currency Target Budget", "Companion & Travel Style Chips")

Export-ShowcaseCard `
    -ScreenshotPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\6 Ai-generated itinerary.png" `
    -OutputPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\showcase_3_generated_itinerary.jpg" `
    -CategoryBadge "Automated Day-by-Day Schedule" `
    -Title "Curated Daily Itinerary" `
    -Subtitle "Complete hour-by-hour schedules featuring swipeable multi-day navigation, verified stays, and integrated hotel booking." `
    -FeaturePills @("Swipeable Multi-Day Tabs", "Timed Activities & Transport", "Integrated Hotel & Flight Booking")

Export-ShowcaseCard `
    -ScreenshotPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\14 Chat Bot.png" `
    -OutputPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\showcase_4_ai_companion_concierge.jpg" `
    -CategoryBadge "24/7 Virtual Concierge" `
    -Title "Conversational AI Companion" `
    -Subtitle "Live intelligent assistant that adjusts your itinerary on the fly, swaps activities, and recommends local spots anytime." `
    -FeaturePills @("Real-Time Activity Swapping", "Local Dining & Attraction Tips", "Instant Schedule Customization")

# --- ALSO EXPORT THE 4 DIRECT FULLSCREEN SCREENSHOTS AS OPTIONAL STANDALONES ---
Convert-ToJpeg -PngPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\4 Home Dashboard.png" -JpegPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\fullscreen_1_home_dashboard.jpg"
Convert-ToJpeg -PngPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\5 Trip Input.png" -JpegPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\fullscreen_2_trip_planner.jpg"
Convert-ToJpeg -PngPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\6 Ai-generated itinerary.png" -JpegPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\fullscreen_3_generated_itinerary.jpg"
Convert-ToJpeg -PngPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\14 Chat Bot.png" -JpegPath "C:\ANTIGRAVITY\AI TRAVEL PLANNER\fullscreen_4_ai_companion.jpg"

Write-Host "--- GENERATED IMAGES SUMMARY ---"
Get-ChildItem -Path "C:\ANTIGRAVITY\AI TRAVEL PLANNER" -Filter "*.jpg" | Select-Object Name, Length, @{Name="SizeKB";Expression={[math]::Round($_.Length / 1024, 1)}} | Format-Table -AutoSize
