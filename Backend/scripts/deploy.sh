#!/bin/bash
set -euo pipefail

cd /home/sammy/GreekGeek/Backend
git fetch origin main
git reset --hard origin/main

source .venv/bin/activate
pip install -r requirements.txt
cd GreekGeekApi/
python3 manage.py collectstatic --noinput --clear
for asset in \
  screenshots/landing/ranking_screen_user.webp \
  screenshots/landing/study_screen_user.webp \
  screenshots/landing/studyperiods_admin.webp \
  screenshots/landing/reports_admin.webp
do
  test -f "staticfiles/$asset" || {
    echo "Missing collected static asset: $asset" >&2
    exit 1
  }
done
python3 manage.py migrate --noinput
sudo -n systemctl restart gunicorn
sudo -n systemctl restart nginx
