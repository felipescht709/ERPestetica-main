# ==============================================================================
# Estágio 1: "Builder"
# Este estágio instala TODAS as dependências, incluindo as de desenvolvimento,
# para que possamos usar ferramentas como o Knex para rodar migrações
# em um passo separado do nosso deploy (ex: no Cloud Build).
# ==============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copia os arquivos de definição de dependências
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies)
RUN npm install

# Copia o resto do código-fonte
COPY . .


# ==============================================================================
# Estágio 2: "Production"
# Este é o estágio final. Criamos uma imagem limpa do Node.js
# e copiamos APENAS o necessário para rodar a aplicação.
# Isso resulta em uma imagem muito menor e mais segura.
# ==============================================================================
FROM node:18-alpine

WORKDIR /app

# Copia os arquivos de definição de dependências
COPY package*.json ./

# --- OTIMIZAÇÃO PRINCIPAL ---
# Instala SOMENTE as dependências de produção.
RUN npm install --omit=dev --no-fund --no-audit

# Copia o código-fonte da aplicação a partir do estágio 'builder'
COPY . .

# Expõe a porta que a aplicação vai usar.
# Lembre-se que o Cloud Run ignora isso e usa a variável de ambiente $PORT.
# Nosso server.js já está preparado para ler essa variável.
EXPOSE 3001

# Comando final para rodar a aplicação em modo de produção.
# Usar `node server.js` é mais direto do que `npm start`.
CMD [ "node", "server.js" ]