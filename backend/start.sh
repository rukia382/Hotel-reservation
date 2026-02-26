#!/usr/bin/env bash
set -e

python manage.py migrate
python manage.py shell <<'PY'
from django.contrib.auth import get_user_model

User = get_user_model()
username = 'Rakey'
password = 'King_kunta_28'

user = User.objects.filter(username=username).first()
if user is None:
    User.objects.create_superuser(username=username, email='', password=password)
    print('Superuser created')
elif user.is_superuser:
    user.set_password(password)
    user.save(update_fields=['password'])
    print('Superuser password updated')
else:
    print('User exists but is not a superuser; no changes made')
PY

gunicorn backend.wsgi:application