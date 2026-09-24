@echo off
cd /d "C:\NurseTec-Apps\guardioes-hcor\backend"
python -m waitress --listen=0.0.0.0:5030 app:app
