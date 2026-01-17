#!/bin/bash
set -e
npm install
npm run build
python manage.py collectstatic --noinput --settings=core.settings.prod
