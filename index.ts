import { Client } from "@notionhq/client"
import { TMDB } from 'tmdb-ts';

// Initializing a client
const notion = new Client({
    auth: process.env.NOTION_TOKEN,
})

const tmdb = new TMDB(process.env.TMDB_TOKEN || '');

console.log(`
    
 _______          __  .__              __      __         __         .__    .__  .__          __   \r\n \\      \\   _____\/  |_|__| ____   ____\/  \\    \/  \\_____ _\/  |_  ____ |  |__ |  | |__| _______\/  |_ \r\n \/   |   \\ \/  _ \\   __\\  |\/  _ \\ \/    \\   \\\/\\\/   \/\\__  \\\\   __\\\/ ___\\|  |  \\|  | |  |\/  ___\/\\   __\\\r\n\/    |    (  <_> )  | |  (  <_> )   |  \\        \/  \/ __ \\|  | \\  \\___|   Y  \\  |_|  |\\___ \\  |  |  \r\n\\____|__  \/\\____\/|__| |__|\\____\/|___|  \/\\__\/\\  \/  (____  \/__|  \\___  >___|  \/____\/__\/____  > |__|  \r\n        \\\/                           \\\/      \\\/        \\\/          \\\/     \\\/             \\\/        
    
    `)

console.log('Connected to Notion and TMDB');
console.log('Watching for changes...');

async function loop() {
    const listDatabasesResponse = await notion.search({
        filter: { property: 'object', value: 'database' },
        query: 'Contents'
    });


    // Process each database in parallel
    await Promise.all(
        listDatabasesResponse.results.map(async (database) => {
            const databaseId = database.id;
            const listPagesResponse = await notion.databases.query({
                database_id: databaseId,
                filter: {
                    property: 'Name',
                    title: { is_not_empty: true }
                }
            });

            const films = listPagesResponse.results.filter(page => page.properties?.Name?.title[0]);
            //console.log(`Films in ${database.title[0].plain_text}: ${films.map(film => film.properties.Name.title[0].plain_text).join(', ')}`);

            const listPropertiesResponse = await notion.databases.retrieve({ database_id: databaseId });
            const block_id = listPropertiesResponse.parent.block_id;

            let genres;

            // Process each film in parallel
            await Promise.all(
                films.map(async (el) => {
                    const elId = el.id;
                    const elProperties = el.properties;
                    const elName = elProperties.Name?.title[0]?.plain_text;
                    const elGenres = elProperties.Genres?.relation?.map(genre => genre.id) || [];
                    const elLength = elProperties.Length?.rich_text[0]?.plain_text || null;
                    const elRating = elProperties["Rating 1-10"]?.number || null;


                    if (!elName) {
                        console.error(`Film with ID ${elId} does not have a name`);
                        return;
                    }

                    // Check missing properties and fetch data from TMDB
                    if (!elLength || elGenres.length === 0 || !elRating) {
                        const searchResults = await tmdb.search.multi({ query: elName, language: process.env.LANG || 'en-US' as any });
                        const movie = searchResults.results[0];
                        if (!movie) {
                            console.error(`Film with ID ${elId} does not have a TMDB match`);
                            return;
                        }

                        // Update Movie Title
                        if (movie.name !== elName) {
                            console.log(`Updating name for ${elName} to ${movie.name || movie.title}`);
                            await notion.pages.update({
                                page_id: elId,
                                properties: {
                                    Name: {
                                        title: [{ type: 'text', text: { content: movie.name || movie.title } }]
                                    }
                                }
                            });
                            console.log(`Name updated for ${elName}`);
                        }

                        const movieDetails = movie.media_type === 'movie' ? await tmdb.movies.details(movie.id, undefined, process.env.LANG || 'en-US' as any) : await tmdb.tvShows.details(movie.id, undefined, process.env.LANG || 'en-US' as any);

                        // Update Length
                        if (!elLength) {
                            const runtime = movie.media_type === 'movie' ? movieDetails.runtime : movieDetails.number_of_episodes;
                            await notion.pages.update({
                                page_id: elId,
                                properties: {
                                    Length: {
                                        rich_text: [{ type: 'text', text: { content: `${runtime} ${movie.media_type === 'movie' ? 'minutes' : 'episodes'}` } }]
                                    }
                                }
                            });
                            console.log(`Length updated for ${elName}`);
                        }

                        // Update Genres
                        if (elGenres.length === 0) {
                            if (!genres) {
                                const listChildResponse = await notion.search({
                                    query: 'Genres',
                                    filter: { property: 'object', value: 'database' }
                                });


                                const genresdb = listChildResponse.results.find(page => page.parent.block_id === block_id);

                                const genredb = await notion.databases.query({
                                    database_id: genresdb.id,
                                    filter: {
                                        property: 'Name',
                                        title: { is_not_empty: true }
                                    }
                                });

                                genres = genredb.results.map(page => ({
                                    id: page.id,
                                    name: page.properties?.Name?.title[0]?.plain_text
                                }));
                            }

                            const enMovieDetails = movie.media_type === 'movie' ? await tmdb.movies.details(movie.id, undefined, 'en-US') : await tmdb.tvShows.details(movie.id, undefined, 'en-US');
                            const tmdbGenres = enMovieDetails.genres.map(genre => genre.name);
                            const genresToAdd = genres.filter(dbGenre => tmdbGenres.includes(dbGenre.name));
                            await notion.pages.update({
                                page_id: elId,
                                properties: {
                                    Genres: {
                                        relation: genresToAdd.map(genre => ({ id: genre.id }))
                                    }
                                }
                            });
                            console.log(`Genres updated for ${elName}`);
                        }

                        // Update Rating
                        if (elRating === null) {
                            await notion.pages.update({
                                page_id: elId,
                                properties: {
                                    "Rating 1-10": { number: Math.round(movieDetails.vote_average || 1) }
                                }
                            });
                            console.log(`Rating updated for ${elName}`);
                        }

                        // Update Cover
                        const elCover = (await notion.pages.retrieve({ page_id: elId })).cover?.external.url || null;
                        if (!elCover) {
                            await notion.pages.update({
                                page_id: elId,
                                cover: {
                                    type: 'external',
                                    external: { url: `https://image.tmdb.org/t/p/original${movieDetails.backdrop_path || movieDetails.poster_path}` }
                                }
                            });
                            console.log(`Cover updated for ${elName}`);
                        }
                    }
                })
            );
        })
    );

    setTimeout(loop, 500);
};
    
loop();
