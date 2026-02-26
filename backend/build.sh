#!/usr/bin/env bash
set -e

pip install -r requirements.txt
python manage.py migrate
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); username='Rakey'; password='King_kunta_28'; u = User.objects.filter(username=username).first(); (u.set_password(password), u.save(), print('Updated superuser password')) if u and u.is_superuser else (print('Superuser exists, not modified') if u else (User.objects.create_superuser(username=username, email='', password=password), print('Superuser created')))"
