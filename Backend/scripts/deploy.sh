cd /home/sammy/GreekGeek/Backend
source .venv/bin/activate
pip install -r requirements.txt
cd GreekGeekApi/
git pull --no-edit
python3 manage.py migrate
sudo systemctl restart gunicorn
sudo systemctl restart nginx