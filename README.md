# Wouter Koppen Portfolio

Een moderne fotografie portfolio website met automatische slideshow en admin beheerpaneel.

## Features

- Fullscreen foto carousel met automatische slideshow
- Voortgangsindicator voor slideshow timing
- Touch en keyboard navigatie
- Responsive design
- Admin panel voor foto beheer:
  - Drag & drop upload
  - Foto informatie bewerken
  - Categorieën toewijzen
  - Foto's verwijderen

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- Containerization: Docker
- Styling: Custom CSS met moderne features

## Installatie

### Met Docker (aanbevolen)

1. Clone de repository:
```bash
git clone https://github.com/[username]/wouterkoppen-portfolio.git
cd wouterkoppen-portfolio
```

2. Maak een `.env` bestand aan:
```bash
cp .env.example .env
```

3. Start met Docker Compose:
```bash
docker-compose up -d
```

De website is nu beschikbaar op `http://localhost:3000`

### Handmatige installatie

1. Zorg dat Node.js en MongoDB zijn geïnstalleerd

2. Clone de repository:
```bash
git clone https://github.com/[username]/wouterkoppen-portfolio.git
cd wouterkoppen-portfolio
```

3. Installeer dependencies:
```bash
npm install
```

4. Maak een `.env` bestand aan:
```bash
cp .env.example .env
```

5. Start MongoDB

6. Start de applicatie:
```bash
npm run dev
```

## Gebruik

### Frontend

- `/` - Homepage met foto carousel
- `/admin` - Beheerpaneel voor foto's

### Admin Panel

Het admin panel is beschikbaar op `/admin` en biedt de volgende functionaliteit:
- Foto's uploaden via drag & drop
- Titel en beschrijving toevoegen/bewerken
- Categorieën toewijzen
- Foto's verwijderen

## Development

### Project Structuur

```
.
├── public/
│   ├── css/
│   │   └── style.css
│   ├── uploads/
│   ├── index.html
│   └── admin.html
├── server.js
├── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

### Docker Commands

- Start: `docker-compose up -d`
- Stop: `docker-compose down`
- Rebuild: `docker-compose build --no-cache`
- Logs bekijken: `docker-compose logs -f`

## Bijdragen

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je wijzigingen (`git commit -m 'Add some AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## License

Dit project is gelicenseerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.