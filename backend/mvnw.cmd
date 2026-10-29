@echo off
setlocal

rem Ensure JAVA_HOME is set if not already present
if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\Java\jdk-17.0.18" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-17.0.18"
    )
)

rem 1. Check if mvn is directly available in PATH
where mvn >nul 2>nul
if %ERRORLEVEL% equ 0 (
    mvn %*
    exit /b %ERRORLEVEL%
)

rem 2. Check IntelliJ bundled Maven
if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.4\plugins\maven\lib\maven3\bin\mvn.cmd" (
    call "C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.4\plugins\maven\lib\maven3\bin\mvn.cmd" %*
    exit /b %ERRORLEVEL%
)

rem 3. Check .m2 wrapper Maven
if exist "C:\Users\Dell\.m2\wrapper\dists\apache-maven-3.9.16-bin\5grr65jo27hi51sujmtcldfovl\apache-maven-3.9.16\bin\mvn.cmd" (
    call "C:\Users\Dell\.m2\wrapper\dists\apache-maven-3.9.16-bin\5grr65jo27hi51sujmtcldfovl\apache-maven-3.9.16\bin\mvn.cmd" %*
    exit /b %ERRORLEVEL%
)

echo ERROR: Maven executable could not be found. Please install Maven or add it to PATH.
exit /b 1
