@echo off
cd /d "%~dp0"
echo Starting Simple Billing Backend...
call mvnw.cmd spring-boot:run
