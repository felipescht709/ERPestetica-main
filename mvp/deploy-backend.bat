@echo off
set PROJECT_ID=erp-estetica
set REGION=southamerica-east1
set SERVICE_NAME=erp-backend
set IMAGE=backend-image

echo 🚀 Ativando projeto: %PROJECT_ID%
gcloud config set project %PROJECT_ID%

echo 🧱 Construindo imagem Docker...
gcloud builds submit --tag %REGION%-docker.pkg.dev/%PROJECT_ID%/backend-repo/%IMAGE%

echo 🛠️ Criando serviço no Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
  --image=%REGION%-docker.pkg.dev/%PROJECT_ID%/backend-repo/%IMAGE% ^
  --platform=managed ^
  --region=%REGION% ^
  --allow-unauthenticated ^
  --port=3000

echo ✅ Deploy concluído!
pause
