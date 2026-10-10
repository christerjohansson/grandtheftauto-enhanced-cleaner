@echo off
del "dist\gta5Enhancedcleaner.exe" 2>nul

REM Build the executable (without --build to avoid vcbuild errors)
nexe . --target windows-x86-14.15.3 -o ./dist/gta5Enhancedcleaner.exe

REM Note: nexe --icon flag may not work without --build
REM If icon is not embedded, use Resource Hacker:
REM Download: http://www.angusj.com/resourcehacker/
REM Command: ResourceHacker.exe -open:dist\gta5Enhancedcleaner.exe -save:dist\gta5Enhancedcleaner.exe -action:Addoverwrite -resource:icon.ico -mask:ICONGROUP,MAIN,

echo Build complete!
echo.
echo If the icon is not embedded, download Resource Hacker from:
echo http://www.angusj.com/resourcehacker/
echo Then run:
echo ResourceHacker.exe -open:dist\gta5Enhancedcleaner.exe -save:dist\gta5Enhancedcleaner.exe -action:Addoverwrite -resource:icon.ico -mask:ICONGROUP,MAIN,
pause
