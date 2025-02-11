# 1️⃣ Pobierz oficjalny obraz Node.js
FROM node:18

# 2️⃣ Ustaw katalog roboczy
WORKDIR /app

# 3️⃣ Skopiuj plik package.json i package-lock.json (jeśli istnieje)
COPY package*.json ./

# 4️⃣ Zainstaluj zależności (np. socket.io, express)
RUN npm install

# 5️⃣ Skopiuj resztę plików projektu
COPY . .

# 6️⃣ Ustaw zmienną PORT dla Google Cloud Run
ENV PORT=8080

# 7️⃣ Otwórz port (choć Cloud Run sam to nadpisuje)
EXPOSE 8080

# 8️⃣ Uruchom serwer aplikacji
CMD ["node", "server.js"]
