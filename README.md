# NotionWatchlist 🎬📝

NotionWatchlist is an automated integration that enriches your Notion movie and TV show watchlist with detailed information from The Movie Database (TMDB).

## Features ✨

- Automatically fetch movie/TV show details
- Update Notion entries with:
  - Accurate titles
  - Runtime/episode count
  - Genres
  - Ratings
  - Cover images
- Supports both movies and TV shows
- Continuous background sync

## Prerequisites 🛠️

- Bun (v1.1.34+ recommended)
- Notion account
- TMDB Account and API Key

## Setup Guide 🚀

### 1. Notion Setup

1. Clone [this](https://www.notion.so/fr/templates/personal-watchlist-notionmonk) notion template

### 2. Obtain API Tokens

#### Notion Token
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration (internal or public)
3. Copy the Internal Integration Token
4. Add the integration to your watchlist

![image](https://github.com/user-attachments/assets/71981cf8-21a9-454e-a32a-a3a4e9626eea)


#### TMDB Token
1. Visit [TMDB](https://www.themoviedb.org/settings/api)
2. Create an account and request an API key
3. Copy your API Read Access Token

### 3. Configuration

Create a `.env` file in your project root:

```env
NOTION_TOKEN=your_notion_integration_token
TMDB_TOKEN=your_tmdb_token
LANG=en-US  # Optional: change language
```

### 4. Installation

```bash
git clone https://github.com/Paylicier/NotionWatchlist.git
cd NotionWatchlist
bun install
bun index.ts
```

## How It Works 🔍

1. Scans your Notion databases
2. Identifies movies/shows with missing information
3. Queries TMDB for details
4. Updates Notion entries automatically
5. Runs continuously in the background

## Limitations ⚠️

- Requires manual initial setup
- Depends on TMDB's search accuracy
- May have rate limiting issues with large databases

## Contributing 🤝

Contributions are welcome! Please open an issue or submit a pull request.

## License 📄

MIT License
