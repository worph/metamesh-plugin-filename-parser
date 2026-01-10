# MetaMesh Plugin: Filename Parser

A MetaMesh plugin that parses video filenames to extract metadata like title, season, episode, and year.

## Description

This plugin analyzes video filenames using the `@metazla/filename-tools` library to extract structured metadata. It handles various naming conventions including:

- Movies: `Movie Title (2024).mkv`
- TV Shows: `Show.S01E05.Episode.Name.mkv`
- Anime: `[Group] Title - 01 [1080p].mkv`

## Metadata Fields

| Field | Description |
|-------|-------------|
| `originalTitle` | Extracted title from filename |
| `videoType` | `movie` or `tvshow` |
| `season` | Season number (TV shows) |
| `episode` | Episode number (TV shows) |
| `movieYear` | Release year |
| `increment` | Episode increment |
| `extra` | Extra info (e.g., "Director's Cut") |

## Dependencies

- Requires `file-info` plugin to run first

## Configuration

No configuration required.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/manifest` | GET | Plugin manifest |
| `/configure` | POST | Update configuration |
| `/process` | POST | Process a file |

## Running Locally

```bash
npm install
npm run build
npm start
```

## Docker

```bash
docker build -t metamesh-plugin-filename-parser .
docker run -p 8080:8080 metamesh-plugin-filename-parser
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `HOST` | `0.0.0.0` | HTTP server host |

## License

MIT
