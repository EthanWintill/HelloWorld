#!/bin/bash
set -euo pipefail

cd /home/sammy/GreekGeek/Backend
git fetch origin main
git reset --hard origin/main

source .venv/bin/activate
pip install -r requirements.txt
cd GreekGeekApi/
python3 manage.py collectstatic --noinput --clear
python3 manage.py migrate --noinput
sudo systemctl restart gunicorn
sudo systemctl restart nginx
