@echo off
title Kamakhya Jewellers Shop Management
echo ========================================================
echo       KAMAKHYA JEWELLERS - SHOP BILLING SYSTEM
echo       Proprietor: DHANANJAY VERMA
echo       New Ashok Nagar, Delhi
echo ========================================================
echo.
echo Starting showroom billing software...
echo Please wait a few seconds...
echo.

cd /d "%~dp0"

REM Open Chrome/Default Browser automatically
start http://localhost:3000

REM Start the counter app
npm run dev
pause
