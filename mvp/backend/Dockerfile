# ==============================================================================
# Estágio 1: "Builder"
# Responsável por instalar TODAS as dependências (incluindo dev)
# e compilar/transpilar o código se necessário (ex: TypeScript).
# ==============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência e instala TUDO
COPY package*.json ./
RUN npm install

# Copia o resto do código-fonte
COPY . .

# (Opcional) Se você usa TypeScript, adicione o passo de build aqui
# RUN npm run build


# ==============================================================================
# Estágio 2: "Production"
# Cria a imagem final, leve e segura para produção.
# ==============================================================================
FROM node:18-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala SOMENTE as dependências de produção
RUN npm install --omit=dev --no-fund --no-audit

# Copia o código-fonte e os node_modules do estágio 'builder'.
# Isso evita ter que rodar 'npm install' duas vezes para as mesmas dependências.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# (Opcional) Se você usou um passo de build no estágio anterior, copie a pasta de build
# COPY --from=builder /app/dist ./dist

EXPOSE 3001

# O comando para iniciar a aplicação
CMD [ "node", "server.js" ]
