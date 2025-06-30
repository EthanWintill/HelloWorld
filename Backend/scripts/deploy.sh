cd /home/sammy/GreekGeek/Backend/GreekGeekApi
git pull
python manage.py migrate
sudo systemctl restart gunicorn
sudo systemctl restart nginx