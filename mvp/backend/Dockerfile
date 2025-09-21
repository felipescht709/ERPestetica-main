# Etapa 1: Definir a imagem base
# Usaremos uma imagem oficial do Node.js. A versão '18-alpine' é leve e recomendada.
FROM node:18-alpine

# Etapa 2: Definir o diretório de trabalho
# Todos os comandos a seguir serão executados dentro da pasta /app no contêiner.
WORKDIR /app

# Etapa 3: Copiar os arquivos de dependência e instalar
# Copiamos package.json e package-lock.json primeiro. O Docker armazena essa camada em cache.
# Se você não alterar suas dependências, o Docker reutilizará essa etapa, tornando os builds futuros mais rápidos.
COPY package*.json ./
COPY knexfile.js ./  
COPY migrations ./migrations 
# Instala as dependências. Usamos 'npm install' para garantir que tanto as dependências de produção
# quanto as de desenvolvimento (como o 'knex') sejam instaladas, pois o serviço 'migrations' precisará delas.
RUN npm install

# Etapa 4: Copiar o código-fonte da aplicação
# Copia todos os outros arquivos do seu backend para o diretório de trabalho no contêiner.
COPY . .

# Etapa 5: Expor a porta
# Informa ao Docker que o contêiner escutará na porta 3000.
EXPOSE 3000

# Etapa 6: Definir o comando de inicialização
# Este é o comando que será executado quando o contêiner iniciar.
# Ele roda o script 'start' definido no seu package.json.
CMD ["npm", "run", "start:prod"]
