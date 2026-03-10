#!/bin/bash
set -e
cd frontend
npm install
npm run build
cd ../backend
pip install -r requirements.txt
python manage.py collectstatic --noinput --settings=core.settings.prod
