@echo off
setlocal EnableExtensions
chcp 65001 >nul
title dsh-pack: 打包项目与用户配置

rem ============================================================
rem  dsh-pack.bat — 把本项目源码 + 用户目录里与本项目相关的配置
rem  打包成 zip，方便整体复制到另一台机器。
rem
rem  用法:
rem    dsh-pack.bat                打包到桌面 dsh-backup 目录
rem    dsh-pack.bat D:\my-backup    打包到指定目录
rem
rem  自动排除（不会进包）:
rem    node_modules / lib / dist / .git / coverage / .web-verify
rem    dsh-minimal-turbo.git.bak / *.log / tmp-*.mjs
rem    以及敏感文件 .env 与 auth.local.env（需要密钥请手动另拷）
rem ============================================================

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
for %%I in ("%PROJECT_ROOT%") do set "PROJECT_NAME=%%~nxI"
set "PROJECT_PARENT=%PROJECT_ROOT%\.."

set "DSH_HOME_DIR=%DSH_HOME%"
if not defined DSH_HOME_DIR set "DSH_HOME_DIR=%USERPROFILE%\.dsh"

set "OUT_DIR=%USERPROFILE%\Desktop\dsh-backup"
if not "%~1"=="" set "OUT_DIR=%~1"
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"`) do set "TS=%%i"
set "STAGE=%TEMP%\dsh-pack-%TS%"
mkdir "%STAGE%\project" 2>nul
mkdir "%STAGE%\config" 2>nul

echo [1/3] 复制项目文件（排除 node_modules/lib/dist/.git/.env 等）...
robocopy "%PROJECT_ROOT%" "%STAGE%\project" /E /XD node_modules lib dist .git coverage .web-verify dsh-minimal-turbo.git.bak /XF *.log .env auth.local.env tmp-*.mjs tmp-wire-output.txt >nul
if %ERRORLEVEL% GEQ 8 (
  echo [错误] 项目文件复制失败。
  goto :fail
)

echo [2/3] 复制用户配置（%DSH_HOME_DIR%）...
if exist "%DSH_HOME_DIR%" (
  robocopy "%DSH_HOME_DIR%" "%STAGE%\config" /E /XD node_modules .dsh-module-fallback sessions tmp-electron-install /XF *.log .env auth.local.env .credentials.yaml credentials*.json credentials*.yaml >nul
  if %ERRORLEVEL% GEQ 8 (
    echo [错误] 用户配置复制失败。
    goto :fail
  )
) else (
  echo       未找到 %DSH_HOME_DIR%，跳过用户配置。
)

echo [3/3] 生成 zip 包...
powershell -NoProfile -Command "Compress-Archive -Path '%STAGE%\project\*' -DestinationPath '%OUT_DIR%\dsh-project-%PROJECT_NAME%-%TS%.zip' -CompressionLevel Optimal -Force"
if errorlevel 1 goto :fail
if exist "%STAGE%\config\*" (
  powershell -NoProfile -Command "Compress-Archive -Path '%STAGE%\config\*' -DestinationPath '%OUT_DIR%\dsh-user-config-%TS%.zip' -CompressionLevel Optimal -Force"
  if errorlevel 1 goto :fail
)

> "%OUT_DIR%\恢复说明-%TS%.txt" echo dsh 备份文件（%TS%）
>> "%OUT_DIR%\恢复说明-%TS%.txt" echo ============================================
>> "%OUT_DIR%\恢复说明-%TS%.txt" echo 1. dsh-project-*.zip     项目源码（已排除 node_modules/lib/.git/.env）
>> "%OUT_DIR%\恢复说明-%TS%.txt" echo    恢复: 解压到目标目录后在根目录执行 pnpm install
>> "%OUT_DIR%\恢复说明-%TS%.txt" echo 2. dsh-user-config-*.zip 用户目录配置（%DSH_HOME_DIR%）
>> "%OUT_DIR%\恢复说明-%TS%.txt" echo    恢复: 解压到 %USERPROFILE% 下还原 .dsh（或对应 DSH_HOME）
>> "%OUT_DIR%\恢复说明-%TS%.txt" echo 3. 注意: .env / auth.local.env / credentials* / 会话记录 / 安装缓存默认不打包，
>> "%OUT_DIR%\恢复说明-%TS%.txt" echo    换机后需要手动配置 API Key 等敏感信息。

rmdir /s /q "%STAGE%" >nul 2>nul
echo.
echo 完成! 备份文件在: %OUT_DIR%
dir /b "%OUT_DIR%\*-%TS%.zip" 2>nul
echo.
echo 注意: .env / auth.local.env 等敏感文件未打包，请视需要手动复制。
exit /b 0

:fail
echo.
echo 打包失败，请检查上面的错误信息。
exit /b 1