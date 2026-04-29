#!/bin/bash
set -euo pipefail

cd /home/sammy/GreekGeek/Backend
source .venv/bin/activate
cd GreekGeekApi/
git pull --no-edit
cd ..
pip install -r requirements.txt
cd GreekGeekApi/
python3 manage.py collectstatic --noinput --clear
python3 manage.py migrate --noinput
sudo systemctl restart gunicorn
sudo systemctl restart nginx
