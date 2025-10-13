# ==============================================================================
# Estágio 1: "Builder"
# Instala todas as dependências e prepara a aplicação.
# ==============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência e instala TUDO
COPY package*.json ./
RUN npm install

# Copia o resto do código-fonte
COPY . .

# (Opcional) Se você usar TypeScript, adicione o passo de build aqui:
# RUN npm run build

# ==============================================================================
# Estágio 2: "Production"
# Cria a imagem final, leve e segura.
# ==============================================================================
FROM node:18-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala SOMENTE as dependências de produção para garantir um ambiente limpo
RUN npm install --omit=dev --no-fund --no-audit

# Copia os artefatos da aplicação (código e node_modules) do estágio 'builder'.
# Isso é mais rápido do que reinstalar e garante consistência.
COPY --from=builder /app .

# Exponha a porta que a aplicação vai usar. O Cloud Run vai injetar a variável PORT.
# A porta que você expõe aqui é mais para documentação.
EXPOSE 3001

# O comando para iniciar a aplicação. Simples e direto.
# Use "npm start" para manter a consistência com o package.json
CMD ["npm", "start"]