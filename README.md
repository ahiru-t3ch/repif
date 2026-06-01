# Tuto

## ml
**ml** project has python version 3.14.3  
```
py -m venv .venv
pip install -r requirements.txt
```

## backend
### FastAPI
```
uvicorn app.main:app --reload
```
```
cd backend
docker build -t flat-price-backend .
docker run --name flat-price-api -p 8000:8000 flat-price-backend
```

Delete image to re run previous command because image name needs to be unique:
```
docker rm flat-price-api
```

Avoid deleting image:
```
docker run --rm --name flat-price-api -p 8000:8000 flat-price-backend
```

### DB
```
docker run -d --name immo-pg --env-file .env -p 5432:5432 postgres:16
```
